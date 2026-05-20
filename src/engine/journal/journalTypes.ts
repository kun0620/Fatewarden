export type JournalEntryType = 'memory' | 'clue' | 'quest_update' | 'recap';

export interface JournalEntry {
  id: string;
  sessionId: string;
  characterId: string;
  type: JournalEntryType;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
}

export interface JournalState {
  entries: JournalEntry[];
}
