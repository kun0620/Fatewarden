import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type StorageBucketId = 'avatars' | 'portraits' | 'thumbnails' | 'campaign-images';

export type StorageFileRecord = {
  id: string;
  userId: string;
  bucketId: StorageBucketId;
  objectPath: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
  ownerKind: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
};

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BUCKET_RULES: Record<StorageBucketId, { maxBytes: number; maxDimension: number; quality: number }> = {
  avatars: { maxBytes: 2 * 1024 * 1024, maxDimension: 512, quality: 0.86 },
  portraits: { maxBytes: 5 * 1024 * 1024, maxDimension: 1400, quality: 0.86 },
  thumbnails: { maxBytes: 3 * 1024 * 1024, maxDimension: 960, quality: 0.82 },
  'campaign-images': { maxBytes: 5 * 1024 * 1024, maxDimension: 1600, quality: 0.84 },
};

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function mapStorageFile(row: Record<string, unknown>): StorageFileRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    bucketId: row.bucket_id as StorageBucketId,
    objectPath: String(row.object_path),
    publicUrl: String(row.public_url ?? ''),
    sizeBytes: Number(row.size_bytes ?? 0),
    mimeType: String(row.mime_type ?? ''),
    ownerKind: String(row.owner_kind ?? 'user'),
    ownerId: typeof row.owner_id === 'string' ? row.owner_id : undefined,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? row.created_at ?? ''),
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export function validateStorageImage(bucket: StorageBucketId, file: File) {
  const rule = BUCKET_RULES[bucket];
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error('File must be JPG, PNG, or WebP.');
  }
  if (file.size > rule.maxBytes) {
    throw new Error(`File must be ${formatBytes(rule.maxBytes)} or smaller.`);
  }
}

async function resizeImage(bucket: StorageBucketId, file: File) {
  const rule = BUCKET_RULES[bucket];
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, rule.maxDimension / Math.max(bitmap.width, bitmap.height));
  if (scale >= 1 && file.size <= rule.maxBytes) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const mimeType = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, rule.quality));
  if (!blob) return file;

  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: mimeType });
}

async function assertStorageCapacity(bucket: StorageBucketId, sizeBytes: number) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('storage-guard', {
    body: { bucket, sizeBytes },
  });
  if (error) throw new Error(error.message || 'Storage limit check failed.');
  if (data && data.allowed === false) {
    throw new Error(`Storage limit exceeded. ${formatBytes(Number(data.remainingBytes ?? 0))} remaining.`);
  }
}

export async function uploadUserImage({
  bucket,
  file,
  ownerId,
  ownerKind = 'user',
  user,
}: {
  bucket: StorageBucketId;
  file: File;
  ownerKind?: string;
  ownerId?: string;
  user: User;
}) {
  const client = requireClient();
  validateStorageImage(bucket, file);
  const resized = await resizeImage(bucket, file);
  validateStorageImage(bucket, resized);
  await assertStorageCapacity(bucket, resized.size);

  const ext = resized.type === 'image/png' ? 'png' : resized.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await client.storage.from(bucket).upload(path, resized, {
    cacheControl: '31536000',
    contentType: resized.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: publicData } = client.storage.from(bucket).getPublicUrl(path);
  const { data, error } = await client.rpc('track_storage_file', {
    target_bucket_id: bucket,
    target_object_path: path,
    target_public_url: publicData.publicUrl,
    target_size_bytes: resized.size,
    target_mime_type: resized.type,
    target_owner_kind: ownerKind,
    target_owner_id: ownerId ?? null,
  });
  if (error) throw error;

  return mapStorageFile(data as Record<string, unknown>);
}

export async function listUserStorageFiles(user: User) {
  const client = requireClient();
  const { data, error } = await client
    .from('storage_files')
    .select('id,user_id,bucket_id,object_path,public_url,size_bytes,mime_type,owner_kind,owner_id,created_at,updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapStorageFile(row as Record<string, unknown>));
}

export async function deleteUserStorageFile(file: StorageFileRecord) {
  const client = requireClient();
  const { error: removeError } = await client.storage.from(file.bucketId).remove([file.objectPath]);
  if (removeError) throw removeError;
  const { error } = await client.from('storage_files').delete().eq('id', file.id);
  if (error) throw error;
}

export async function getStorageUsage(user: User) {
  const files = await listUserStorageFiles(user);
  const usedBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const byBucket = files.reduce<Record<StorageBucketId, number>>(
    (acc, file) => {
      acc[file.bucketId] += file.sizeBytes;
      return acc;
    },
    { avatars: 0, portraits: 0, thumbnails: 0, 'campaign-images': 0 },
  );
  return {
    files,
    usedBytes,
    limitBytes: 100 * 1024 * 1024,
    byBucket,
  };
}
