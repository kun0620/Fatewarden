import type { User } from '@supabase/supabase-js';
import { listVaultCharacters } from './characters';
import { listJoinedSessions } from './sessions';
import { supabase } from './supabase';
import { listUserStorageFiles } from './storage';

type CampaignExportRow = {
  id: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  draft_data?: Record<string, unknown> | null;
  published_data?: Record<string, unknown> | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function safeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export';
}

export function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function listOwnedCampaignExports(user: User) {
  const client = requireClient();
  const { data, error } = await client
    .from('campaigns')
    .select('id,title,summary,description,draft_data,published_data,updated_at,created_at')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) {
    if (error.code === '42P01' || error.code === '42703') return [];
    throw error;
  }
  return (data ?? []) as CampaignExportRow[];
}

export function downloadCampaignExport(row: CampaignExportRow) {
  const payload = row.published_data ?? row.draft_data ?? {
    meta: {
      id: row.id,
      title: row.title,
      description: row.description ?? row.summary ?? '',
      version: '1.0.0',
      author: '',
      recommended_level: 1,
      min_players: 1,
      max_players: 5,
    },
    acts: [],
  };
  downloadJsonFile(`${safeName(row.title)}.campaign.json`, payload);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writeU16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function makeZip(files: Array<{ name: string; data: Uint8Array }>) {
  const out: number[] = [];
  const central: number[] = [];
  let offset = 0;

  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const localOffset = offset;

    writeU32(out, 0x04034b50);
    writeU16(out, 20);
    writeU16(out, 0);
    writeU16(out, 0);
    writeU16(out, 0);
    writeU16(out, 0);
    writeU32(out, crc);
    writeU32(out, file.data.length);
    writeU32(out, file.data.length);
    writeU16(out, name.length);
    writeU16(out, 0);
    out.push(...name, ...file.data);
    offset = out.length;

    writeU32(central, 0x02014b50);
    writeU16(central, 20);
    writeU16(central, 20);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU32(central, crc);
    writeU32(central, file.data.length);
    writeU32(central, file.data.length);
    writeU16(central, name.length);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU32(central, 0);
    writeU32(central, localOffset);
    central.push(...name);
  }

  const centralOffset = out.length;
  out.push(...central);
  writeU32(out, 0x06054b50);
  writeU16(out, 0);
  writeU16(out, 0);
  writeU16(out, files.length);
  writeU16(out, files.length);
  writeU32(out, central.length);
  writeU32(out, centralOffset);
  writeU16(out, 0);
  return new Uint8Array(out);
}

function jsonBytes(data: unknown) {
  return new TextEncoder().encode(JSON.stringify(data, null, 2));
}

async function fetchProfile(user: User) {
  const client = requireClient();
  const { data, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error && error.code !== '42P01') throw error;
  return data ?? { id: user.id, email: user.email ?? '' };
}

export async function exportAllUserData(user: User) {
  const client = requireClient();
  const [
    profile,
    characters,
    campaigns,
    sessions,
    storageFiles,
    campaignSaves,
    campaignProgress,
  ] = await Promise.all([
    fetchProfile(user),
    listVaultCharacters(user),
    listOwnedCampaignExports(user),
    listJoinedSessions(),
    listUserStorageFiles(user),
    client.from('campaign_saves').select('*').eq('user_id', user.id),
    client.from('campaign_progress').select('*').eq('user_id', user.id),
  ]);

  if (campaignSaves.error && campaignSaves.error.code !== '42P01') throw campaignSaves.error;
  if (campaignProgress.error && campaignProgress.error.code !== '42P01') throw campaignProgress.error;

  const exportedAt = new Date().toISOString();
  const files = [
    { name: 'manifest.json', data: jsonBytes({ exportedAt, userId: user.id, format: 'fatewarden-all-data-v1' }) },
    { name: 'profile.json', data: jsonBytes(profile) },
    { name: 'characters.json', data: jsonBytes(characters) },
    { name: 'campaigns.json', data: jsonBytes(campaigns) },
    { name: 'sessions.json', data: jsonBytes(sessions) },
    { name: 'campaign-saves.json', data: jsonBytes(campaignSaves.data ?? []) },
    { name: 'campaign-progress.json', data: jsonBytes(campaignProgress.data ?? []) },
    { name: 'storage-files.json', data: jsonBytes(storageFiles) },
  ];
  const zip = makeZip(files);
  const blob = new Blob([zip], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fatewarden-data-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
