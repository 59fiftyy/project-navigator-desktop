import { useEffect, useMemo, useState } from "react";
import { FilePlus2, Save } from "lucide-react";
import { toast } from "sonner";

import { useProject } from "@/app/projectStore";
import { relativePath } from "@/app/projectInsights";
import { resolveDocuments, targetPath, type ResolvedDocument } from "@/app/documentation";
import { ScreenHeader, EmptyHint } from "@/ui/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function DocumentationScreen() {
  const { context, writeProjectFile } = useProject();
  const [activeId, setActiveId] = useState("vision");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const documents = useMemo<ResolvedDocument[]>(
    () => (context ? resolveDocuments(context) : []),
    [context],
  );

  const active = documents.find((document) => document.section.id === activeId) ?? documents[0];

  useEffect(() => {
    setDraft(active?.content ?? "");
  }, [active?.path, active?.content, active?.section.id]);

  if (!context || !active) {
    return null;
  }

  const path = targetPath(context, active);
  const dirty = active.content !== null && draft !== active.content;

  const save = async () => {
    setBusy(true);
    try {
      await writeProjectFile(path, draft);
      toast.success(`Saved ${active.section.fileName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the document.");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      await writeProjectFile(path, active.section.template);
      toast.success(`Created ${active.section.fileName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title="Documentation"
        description="Edits are written straight to the project's source files"
        actions={
          active.content !== null ? (
            <Button size="sm" disabled={!dirty || busy} onClick={() => void save()}>
              <Save className="size-4" />
              Save
            </Button>
          ) : null
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)] overflow-hidden">
        <nav className="flex min-h-0 flex-col gap-0.5 overflow-auto border-r border-border p-3">
          {documents.map((document) => {
            const isActive = document.section.id === active.section.id;
            return (
              <button
                key={document.section.id}
                type="button"
                onClick={() => setActiveId(document.section.id)}
                className={cn(
                  "rounded-md px-3 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  {document.section.label}
                  {document.content === null ? (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      missing
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                  {document.section.fileName}
                </span>
              </button>
            );
          })}
        </nav>

        <section className="flex min-h-0 flex-col gap-3 p-6">
          <p className="break-all font-mono text-[11px] text-muted-foreground">
            {relativePath(context, path)}
          </p>

          {active.content === null ? (
            <div className="space-y-4">
              <EmptyHint>
                {active.section.fileName} does not exist in this project yet.
              </EmptyHint>

              <div className="flex justify-center">
                <Button variant="outline" disabled={busy} onClick={() => void create()}>
                  <FilePlus2 className="size-4" />
                  Create {active.section.fileName}
                </Button>
              </div>
            </div>
          ) : (
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none font-mono text-xs leading-relaxed"
            />
          )}
        </section>
      </div>
    </div>
  );
}
