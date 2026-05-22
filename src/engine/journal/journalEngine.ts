import type { JournalEntry, JournalEntryType, JournalState } from './journalTypes';

export function addEntry(state: JournalState, entry: JournalEntry): JournalState {
  return { entries: [...state.entries, entry] };
}

export function removeEntry(state: JournalState, entryId: string): JournalState {
  return { entries: state.entries.filter((e) => e.id !== entryId) };
}

export function filterByType(state: JournalState, type: JournalEntryType): JournalEntry[] {
  return state.entries.filter((e) => e.type === type);
}

export function searchEntries(state: JournalState, keyword: string): JournalEntry[] {
  const lower = keyword.toLowerCase();
  return state.entries.filter(
    (e) =>
      e.title.toLowerCase().includes(lower) ||
      e.content.toLowerCase().includes(lower) ||
      e.tags.some((t) => t.toLowerCase().includes(lower)),
  );
}
