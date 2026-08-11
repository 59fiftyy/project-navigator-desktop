import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useProject } from "@/app/projectStore";
import { useNotes } from "@/app/useNotes";
import { ScreenHeader, EmptyHint } from "@/ui/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function NotesScreen() {
  const { projectPath, context } = useProject();
  const { notes, addNote, removeNote } = useNotes(projectPath);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const submit = () => {
    if (!title.trim() && !body.trim()) return;
    addNote(title, body);
    setTitle("");
    setBody("");
  };

  return (
    <div className="pb-12">
      <ScreenHeader
        title="Notes"
        description={`Stored locally, scoped to ${context?.project.name ?? "this project"}`}
      />

      <div className="grid gap-6 px-8 py-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit gap-3 py-5">
          <CardContent className="space-y-3 px-5">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Note title"
            />
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What did you learn about this project?"
              rows={6}
            />
            <Button className="w-full" onClick={submit}>
              <Plus className="size-4" />
              Add note
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {notes.length === 0 ? (
            <EmptyHint>No notes yet for this project.</EmptyHint>
          ) : (
            notes.map((note) => (
              <Card key={note.id} className="gap-2 py-4">
                <CardContent className="px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{note.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {new Date(note.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete note"
                      onClick={() => removeNote(note.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {note.body ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
                      {note.body}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
