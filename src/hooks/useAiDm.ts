import { useCallback, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { addUniqueMessage } from '../components/StoryLog';
import { requestAiDmReply } from '../lib/messages';
import { updateSessionAiState } from '../lib/sessions';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { Character, EncounterState, GameSession, StoryMessage } from '../types';

function formatLocalTime() {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function hasSceneFlow(messages: StoryMessage[]) {
  return messages.some((message) => {
    const kind = message.metadata?.kind;
    return (kind === 'scene_opening' || kind === 'scene_objective') && Boolean(message.metadata?.scene);
  });
}

export function useAiDm(
  activeSession: GameSession | null,
  character: Character,
  encounter: EncounterState | null,
  user: User | null,
  storyMessages: StoryMessage[],
  onMessagesChange: (fn: (current: StoryMessage[]) => StoryMessage[]) => void,
) {
  const [openingSceneBusy, setOpeningSceneBusy] = useState(false);

  const askAiToOpenScene = useCallback(
    async (premise: string) => {
      if (openingSceneBusy) return false;
      const trimmedPremise = premise.trim();
      const prompt = [
        'เริ่มการผจญภัยของโต๊ะ DnD นี้แบบ AI Dungeon Master ภาษาไทย',
        trimmedPremise
          ? `Premise จากโต๊ะ: ${trimmedPremise}`
          : 'ถ้าไม่มี premise ให้สร้าง opening scene ที่เล่นต่อได้ทันทีจาก theme ของห้อง',
        'ใช้สไตล์ dark fantasy / cosmic horror / mystery / psychological pressure แบบ dangerous but fair',
        'สร้าง scene, atmosphere, current danger, objective, tactical context และ choices ตามสถานการณ์จริง',
        'choices ต้องไม่เป็น generic และจำนวนเลือกตามสถานการณ์ 2-6 ข้อ ส่วน UI จะเติม "ทำอย่างอื่น..." เอง',
        'อย่าเปลี่ยน HP, condition, turn, phase, inventory หรือ encounter state เอง ถ้าจำเป็นให้เสนอ events เพื่อให้ UI confirm',
      ].join('\n');

      if (!activeSession || !user || !supabase) {
        setOpeningSceneBusy(true);
        onMessagesChange((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'dm',
            author: 'Dungeon Master',
            body: trimmedPremise
              ? `ฉากเปิดเริ่มจาก: ${trimmedPremise}`
              : 'หมอกเย็นคลี่ตัวเหนือถนนหินเก่า โต๊ะพร้อมแล้วสำหรับการผจญภัยแรก',
            createdAt: formatLocalTime(),
            metadata: {
              kind: 'scene_opening',
              scene: {
                title: 'Opening Scene',
                location: trimmedPremise || 'A shadowed frontier road',
                objective: 'เลือกการกระทำแรกของปาร์ตี้',
                hook: 'มีบางอย่างผิดปกติรอให้ค้นพบ',
                nextActions: ['Investigate', 'Talk', 'Travel', 'Roll Skill'],
              },
            },
          }),
        );
        setOpeningSceneBusy(false);
        return true;
      }

      setOpeningSceneBusy(true);
      try {
        const message = await requestAiDmReply(activeSession.id, character.name, prompt, storyMessages, {
          session: activeSession,
          gamePhase: 'setup',
          character,
          encounter,
          aiMode: 'adventure',
          requestMode: 'session_start',
          dmPresetId: activeSession.dmPreset,
          sessionRecap: activeSession.sessionRecap,
          partySummary: `${character.name}, level ${character.level} ${character.ancestry} ${character.className}`,
        });
        onMessagesChange((current) => addUniqueMessage(current, message));
        return true;
      } catch (error) {
        onMessagesChange((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not ask AI DM to open the scene.',
            createdAt: formatLocalTime(),
          }),
        );
        return false;
      } finally {
        setOpeningSceneBusy(false);
      }
    },
    [activeSession, character, encounter, openingSceneBusy, storyMessages, user, onMessagesChange],
  );

  const askAiForRestSummary = useCallback(async () => {
    if (openingSceneBusy || !activeSession || !user || !supabase) return;

    setOpeningSceneBusy(true);
    try {
      const message = await requestAiDmReply(
        activeSession.id,
        character.name,
        [
          'สรุปช่วงพักของ session นี้เป็นภาษาไทย',
          'ให้มีเหตุการณ์สำคัญ consequence, unresolved threat, และ next hook',
          'อย่าเปลี่ยน HP, condition, inventory, phase หรือ encounter state เอง',
        ].join('\n'),
        storyMessages,
        {
          session: activeSession,
          gamePhase: 'rest',
          character,
          encounter,
          aiMode: 'adventure',
          requestMode: 'recap',
          dmPresetId: activeSession.dmPreset,
          sessionRecap: activeSession.sessionRecap,
          partySummary: `${character.name}, level ${character.level} ${character.ancestry} ${character.className}`,
        },
      );
      onMessagesChange((current) =>
        addUniqueMessage(current, {
          ...message,
          metadata: {
            ...message.metadata,
            kind: 'rest_summary',
          },
        }),
      );
      await updateSessionAiState(activeSession.id, {
        sessionRecap: message.body,
        markAutosaved: true,
      }).catch((saveError) => {
        console.warn('Could not persist AI DM recap', saveError);
      });
    } catch (error) {
      onMessagesChange((current) =>
        addUniqueMessage(current, {
          id: crypto.randomUUID(),
          speaker: 'system',
          author: 'Table',
          body: error instanceof Error ? error.message : 'Could not ask AI DM for a recap.',
          createdAt: formatLocalTime(),
        }),
      );
    } finally {
      setOpeningSceneBusy(false);
    }
  }, [activeSession, character, encounter, openingSceneBusy, storyMessages, user, onMessagesChange]);

  return {
    openingSceneBusy,
    hasOpeningScene: hasSceneFlow(storyMessages),
    askAiToOpenScene,
    askAiForRestSummary,
  };
}
