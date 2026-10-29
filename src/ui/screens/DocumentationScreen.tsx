import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useProject } from "@/app/projectStore";
import { relativePath } from "@/app/projectInsights";
import { resolveDocuments, targetPath, type ResolvedDocument } from "@/app/documentation";
import { buildContextBrief, estimateTokens, formatTokens } from "@/app/contextBrief";
import { copyText } from "@/lib/clipboard";
import { openPath } from "@/platform/desktopService";
import { OPEN_DOC_EVENT } from "@/ui/layout/CommandPalette";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Filter = "all" | "missing";

export function DocumentationScreen() {
  const { context, desktop, writeProjectFile } = useProject();
  const [activeId, setActiveId] = useState("vision");
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(() => new Set());
  const [copied, setCopied] = useState(false);

  const documents = useMemo<ResolvedDocument[]>(
    () => (context ? resolveDocuments(context) : []),
    [context],
  );

  const active = documents.find((document) => document.section.id === activeId) ?? documents[0];
  const missingCount = documents.filter((doc) => doc.content === null).length;
  const listed = filter === "missing" ? documents.filter((doc) => doc.content === null) : documents;

  useEffect(() => {
    setDraft(active?.content ?? "");
  }, [active?.path, active?.content, active?.section.id]);

  const dirty = active !== undefined && active.content !== null && draft !== active.content;

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Brief: the active doc plus every other existing doc the user keeps ticked.
  const briefDocs = useMemo(
    () =>
      documents.filter(
        (doc) =>
          doc.content !== null &&
          (doc.section.id === active?.section.id || !excluded.has(doc.section.id)),
      ),
    [documents, excluded, active?.section.id],
  );
  const brief = useMemo(
    () => (context ? buildContextBrief(context, briefDocs) : ""),
    [context, briefDocs],
  );
  const briefTokens = estimateTokens(brief);

  const selectDocument = (id: string) => {
    if (dirty && id !== active?.section.id) {
      const proceed = window.confirm(
        `"${active?.section.label}" has unsaved changes. Discard them and switch?`,
      );
      if (!proceed) return false;
    }
    setActiveId(id);
    setCopied(false);
    return true;
  };

  // Command palette can jump straight to a document.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (typeof id === "string") selectDocument(id);
    };
    window.addEventListener(OPEN_DOC_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_DOC_EVENT, onOpen);
  });

  if (!context || !active) {
    return null;
  }

  const path = targetPath(context, active);

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

  const open = () => {
    if (!active.path) return;
    openPath(active.path).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not open the file."),
    );
  };

  const copyBrief = async () => {
    const ok = await copyText(brief);
    if (!ok) {
      toast.error("Could not copy to the clipboard.");
      return;
    }
    setCopied(true);
    toast.success(`Brief copied · about ${formatTokens(briefTokens)} tokens`);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (dirty && !busy) void save();
    }
  };

  const tab = (on: boolean) =>
    cn(
      "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors",
      on ? "bg-selected font-semibold text-foreground" : "text-muted-foreground hover:bg-hover",
    );

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(260px,400px)_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col border-r border-border px-3 py-5">
        <div className="flex items-center gap-1 pb-3">
          <button type="button" className={tab(filter === "all")} onClick={() => setFilter("all")}>
            All<span className="tabular-nums text-muted-foreground">{documents.length}</span>
          </button>
          <button
            type="button"
            className={tab(filter === "missing")}
            onClick={() => setFilter("missing")}
          >
            Missing<span className="tabular-nums text-signal">{missingCount}</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {listed.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Every document exists.</p>
          ) : null}
          {listed.map((doc) => {
            const isActive = doc.section.id === active.section.id;
            const marked = doc.content === null || (isActive && dirty);
            return (
              <button
                key={doc.section.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => selectDocument(doc.section.id)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  isActive ? "bg-selected" : "hover:bg-hover",
                )}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", marked ? "bg-signal" : "")}
                  />
                  {doc.section.fileName}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {doc.content === null ? "missing" : ""}
                </span>
                <span className="pl-3.5 text-[13px] text-muted-foreground">
                  {doc.section.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="flex min-h-0 min-w-0 flex-col overflow-y-auto bg-surface-raised px-10 py-8"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-baseline gap-3.5">
          <h1 className="text-2xl font-semibold tracking-tight">{active.section.fileName}</h1>
          <span className="text-muted-foreground">{active.section.description}</span>
          <div className="ml-auto flex gap-2">
            {active.path && desktop ? (
              <Button variant="outline" size="sm" onClick={open}>
                Open
              </Button>
            ) : null}
            {active.content !== null ? (
              <Button size="sm" disabled={!dirty || busy} onClick={() => void save()}>
                Save
              </Button>
            ) : null}
          </div>
        </div>

        <p
          className={cn(
            "mt-2.5 font-semibold",
            active.content === null || dirty ? "text-signal" : "text-muted-foreground",
          )}
        >
          {active.content === null
            ? "This file does not exist yet."
            : dirty
              ? "Unsaved changes · Ctrl+S to save."
              : "Saved."}
        </p>
        <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
          {relativePath(context, path)}
        </p>

        {active.content === null ? (
          <div className="mt-8">
            <Button disabled={busy} onClick={() => void create()}>
              Create {active.section.fileName}
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              aria-label={`${active.section.fileName} content`}
              className="mt-6 min-h-[320px] max-w-[760px] flex-1 resize-y bg-background font-mono text-[12.5px] leading-relaxed"
            />

            <div className="mt-9 max-w-[620px]">
              <div className="mb-1 flex items-baseline">
                <b className="font-semibold">Brief for an AI assistant</b>
                <span className="ml-auto text-[13px] text-muted-foreground">
                  Tick what to include
                </span>
              </div>
              {documents
                .filter((doc) => doc.content !== null)
                .map((doc) => {
                  const isActive = doc.section.id === active.section.id;
                  const checked = isActive || !excluded.has(doc.section.id);
                  return (
                    <label
                      key={doc.section.id}
                      className="-mx-2.5 grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_56px] items-center gap-3.5 rounded-md px-2.5 py-2 hover:bg-hover"
                    >
                      <input
                        type="checkbox"
                        className="size-[15px] accent-primary"
                        checked={checked}
                        disabled={isActive}
                        onChange={() =>
                          setExcluded((current) => {
                            const next = new Set(current);
                            if (next.has(doc.section.id)) next.delete(doc.section.id);
                            else next.add(doc.section.id);
                            return next;
                          })
                        }
                      />
                      <span className="truncate font-mono text-[12.5px]">
                        {relativePath(context, doc.path ?? "")}
                      </span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        {formatTokens(estimateTokens(doc.content ?? ""))}
                      </span>
                    </label>
                  );
                })}
              <div className="mt-5 flex items-center gap-3">
                <Button onClick={() => void copyBrief()}>{copied ? "Copied" : "Copy brief"}</Button>
                <span className="tabular-nums text-muted-foreground">
                  ≈ {formatTokens(briefTokens)} tokens
                </span>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
