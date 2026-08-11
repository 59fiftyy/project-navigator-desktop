import { useCallback, useEffect, useState } from "react";

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

function storageKey(projectPath: string | null): string {
  return `atlas.notes:${projectPath ?? "__none__"}`;
}

function read(projectPath: string | null): Note[] {
  try {
    const raw = localStorage.getItem(storageKey(projectPath));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Note[]) : [];
  } catch {
    return [];
  }
}

/** Notes are UI-level persistence, scoped per project path. */
export function useNotes(projectPath: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    setNotes(read(projectPath));
  }, [projectPath]);

  const persist = useCallback(
    (next: Note[]) => {
      setNotes(next);
      try {
        localStorage.setItem(storageKey(projectPath), JSON.stringify(next));
      } catch {
        /* best effort */
      }
    },
    [projectPath],
  );

  const addNote = useCallback(
    (title: string, body: string) => {
      const note: Note = {
        id: crypto.randomUUID(),
        title: title.trim() || "Untitled note",
        body: body.trim(),
        updatedAt: new Date().toISOString(),
      };
      persist([note, ...notes]);
    },
    [notes, persist],
  );

  const removeNote = useCallback(
    (id: string) => {
      persist(notes.filter((note) => note.id !== id));
    },
    [notes, persist],
  );

  return { notes, addNote, removeNote };
}
