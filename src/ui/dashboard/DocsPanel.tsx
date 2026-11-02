import {
  BookOpen,
  CalendarRange,
  ClipboardList,
  Eye,
  FilePlus,
  FileText,
  GitBranch,
  History,
  Lightbulb,
  ListChecks,
  Map as MapIcon,
  Scale,
  Shield,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { ProjectContext } from "@/engine";
import { useProject } from "@/app/projectStore";
import { documentationDirectory, resolveDocuments, targetPath } from "@/app/documentation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

const SECTION_ICONS: Record<string, LucideIcon> = {
  vision: Eye,
  goals: Target,
  features: Sparkles,
  requirements: ClipboardList,
  decisions: Scale,
  roadmap: MapIcon,
  readme: BookOpen,
};

/** Icons for documents Atlas does not know in advance, picked by keywords in the name. */
const KEYWORD_ICONS: [RegExp, LucideIcon, string][] = [
  [/change|release|history/i, History, "Change history"],
  [/security|privacy/i, Shield, "Security notes"],
  [/todo|task|backlog/i, ListChecks, "Tasks and backlog"],
  [/plan|schedule|milestone/i, CalendarRange, "Plans and milestones"],
  [/idea|brainstorm|research/i, Lightbulb, "Ideas and research"],
  [/contribut|git|branch/i, GitBranch, "Contribution guide"],
  [/guide|manual|usage|tutorial/i, BookOpen, "Guide"],
];

function customMeta(name: string): { icon: LucideIcon; description: string } {
  const hit = KEYWORD_ICONS.find(([re]) => re.test(name));
  return hit
    ? { icon: hit[1], description: hit[2] }
    : { icon: FileText, description: "Project document" };
}

interface Card {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  missing: boolean;
  onCreate?: () => void;
}

export function DocsPanel({
  context,
  onViewAll,
}: {
  context: ProjectContext;
  onViewAll: () => void;
}) {
  const { writeProjectFile } = useProject();
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const write = async (path: string, content: string, label: string) => {
    setBusy(true);
    try {
      await writeProjectFile(path, content);
      toast.success(`${label} created`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not create ${label}.`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const cards = useMemo<Card[]>(() => {
    const known = resolveDocuments(context);
    const knownNames = new Set(known.map((d) => d.section.fileName.toLowerCase()));
    const dir = documentationDirectory(context).replace(/\\/g, "/");
    const extra = context.project.files.filter(
      (f) =>
        f.path.replace(/\\/g, "/").startsWith(`${dir}/`) &&
        f.name.toLowerCase().endsWith(".md") &&
        !knownNames.has(f.name.toLowerCase()),
    );
    return [
      ...known.map((doc) => ({
        key: doc.section.id,
        name: doc.section.fileName,
        description: doc.section.description,
        icon: SECTION_ICONS[doc.section.id] ?? FileText,
        missing: doc.path === null,
        onCreate: () =>
          void write(targetPath(context, doc), doc.section.template, doc.section.fileName),
      })),
      ...extra.map((f) => ({ key: f.path, name: f.name, missing: false, ...customMeta(f.name) })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  const createCustom = async () => {
    const base = name
      .trim()
      .replace(/\.md$/i, "")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim();
    if (!base) return;
    const fileName = `${base}.md`;
    if (cards.some((c) => c.name.toLowerCase() === fileName.toLowerCase())) {
      toast.error(`${fileName} already exists.`);
      return;
    }
    const ok = await write(
      `${documentationDirectory(context)}/${fileName}`,
      `# ${base}\n\n`,
      fileName,
    );
    if (ok) {
      setName("");
      setNaming(false);
    }
  };

  const present = cards.filter((c) => !c.missing).length;

  return (
    <Panel
      title="Documentation"
      meta={`${present}/${cards.length}`}
      action="View all"
      onAction={onViewAll}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {cards.map(({ key, name: fileName, description, icon: Icon, missing, onCreate }) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            onClick={missing ? onCreate : onViewAll}
            className={cn(
              "flex min-w-0 flex-col items-start gap-2 rounded-md border border-border p-3 text-left transition-colors hover:bg-hover disabled:opacity-60",
              missing && "border-dashed",
            )}
          >
            <Icon className={cn("size-4", missing ? "text-muted-foreground" : "text-signal")} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-foreground">{fileName}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {missing ? "Missing · click to create" : description}
              </p>
            </div>
          </button>
        ))}

        {naming ? (
          <form
            className="flex flex-col gap-2 rounded-md border border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void createCustom();
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setNaming(false)}
              placeholder="Document name"
              aria-label="Document name"
              className="h-7 min-w-0 rounded border border-border bg-background px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-signal"
            />
            <Button type="submit" size="sm" variant="outline" disabled={busy || !name.trim()}>
              Create
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            <FilePlus className="size-4" />
            New document
          </button>
        )}
      </div>
    </Panel>
  );
}
