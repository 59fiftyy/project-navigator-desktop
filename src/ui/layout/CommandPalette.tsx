import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useProject } from "@/app/projectStore";
import { resolveDocuments } from "@/app/documentation";
import { relativePath } from "@/app/projectInsights";
import { openPath } from "@/platform/desktopService";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SECTIONS, type SectionId } from "./Sidebar";

export const OPEN_DOC_EVENT = "atlas:open-doc";
const MAX_FILE_RESULTS = 50;

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (id: SectionId) => void;
}) {
  const { context, desktop } = useProject();
  const [query, setQuery] = useState("");

  const documents = useMemo(() => (context ? resolveDocuments(context) : []), [context]);

  // Filter files ourselves so cmdk never has to render thousands of items.
  const files = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!context || needle.length < 2) return [];
    const results = [];
    for (const file of context.project.files) {
      if (file.name.toLowerCase().includes(needle)) {
        results.push(file);
        if (results.length >= MAX_FILE_RESULTS) break;
      }
    }
    return results;
  }, [context, query]);

  const close = () => {
    onOpenChange(false);
    setQuery("");
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search screens, docs and files…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Screens">
          {SECTIONS.map((section) => (
            <CommandItem
              key={section.id}
              value={`screen ${section.label}`}
              onSelect={() => {
                onNavigate(section.id);
                close();
              }}
            >
              {section.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Documentation">
          {documents.map((doc) => (
            <CommandItem
              key={doc.section.id}
              value={`doc ${doc.section.fileName} ${doc.section.label}`}
              onSelect={() => {
                onNavigate("docs");
                window.dispatchEvent(new CustomEvent(OPEN_DOC_EVENT, { detail: doc.section.id }));
                close();
              }}
            >
              <span>{doc.section.fileName}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {doc.content === null ? "missing" : doc.section.description}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        {files.length > 0 && context ? (
          <CommandGroup heading="Files">
            {files.map((file) => (
              <CommandItem
                key={file.path}
                value={`file ${file.path}`}
                onSelect={() => {
                  close();
                  if (!desktop) {
                    toast.error("Opening files needs the desktop app.");
                    return;
                  }
                  openPath(file.path).catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Could not open the file.",
                    ),
                  );
                }}
              >
                <span className="truncate font-mono text-xs">
                  {relativePath(context, file.path)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
