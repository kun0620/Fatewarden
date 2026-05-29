import type { GamePhase } from '../types';

export type GamePhaseDefinition = {
  id: GamePhase;
  label: string;
  shortLabel: string;
  description: string;
  composerPlaceholder: string;
};

export const gamePhases: GamePhaseDefinition[] = [
  {
    id: 'setup',
    label: 'Setup',
    shortLabel: 'Setup',
    description: 'เตรียมโต๊ะ เลือกตัวละคร เช็กกฎ และตั้งฉากก่อนเริ่มเล่นจริง',
    composerPlaceholder: 'เตรียมฉาก เปิดโต๊ะ หรือบอก AI DM ว่าอยากเริ่มแคมเปญแบบไหน...',
  },
  {
    id: 'exploration',
    label: 'Exploration',
    shortLabel: 'Explore',
    description: 'สำรวจ คุยกับ NPC ตรวจร่องรอย ขอ skill check และเดินเรื่อง',
    composerPlaceholder: 'บรรยายการสำรวจ ถามหาเบาะแส หรือขอให้ AI DM แนะนำ skill check...',
  },
  {
    id: 'combat',
    label: 'Combat',
    shortLabel: 'Combat',
    description: 'ติดตาม initiative, turn, damage, healing และ condition ระหว่างปะทะ',
    composerPlaceholder: 'บอก action ในเทิร์นนี้ ขอ ruling การโจมตี หรือให้ AI DM บรรยายผล combat...',
  },
  {
    id: 'rest',
    label: 'Rest / Summary',
    shortLabel: 'Rest',
    description: 'พัก ฟื้นฟู สรุปเหตุการณ์ แจก note และเตรียม session ถัดไป',
    composerPlaceholder: 'สรุปฉากพัก ฟื้นฟูทรัพยากร หรือให้ AI DM ช่วย recap เป็นภาษาไทย...',
  },
];

export function normalizeGamePhase(value: unknown): GamePhase {
  return gamePhases.some((phase) => phase.id === value) ? (value as GamePhase) : 'setup';
}

export function getGamePhaseDefinition(value: unknown): GamePhaseDefinition {
  return gamePhases.find((phase) => phase.id === normalizeGamePhase(value)) ?? gamePhases[0];
}
