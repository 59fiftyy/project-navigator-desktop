import { Moon, Search, Sun } from "lucide-react";

import { useProject } from "@/app/projectStore";
import { useTheme } from "@/app/theme";

const barButton =
  "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors duration-150 ease-out hover:bg-hover hover:text-foreground disabled:opacity-50";

export function TopBar({ onSearch }: { onSearch: () => void }) {
  const { context, chooseProject, reanalyze, status } = useProject();
  const { theme, setTheme } = useTheme();
  const analyzing = status === "analyzing";

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 bg-surface pl-4 pr-2">
      <span className="w-[200px] shrink-0 font-bold">Atlas</span>

      <button
        type="button"
        className={`${barButton} text-foreground`}
        onClick={() => void chooseProject()}
        title="Switch project"
        translate="no"
      >
        {context?.project.name ?? "No project"} ▾
      </button>

      <button
        type="button"
        onClick={onSearch}
        className="mx-auto flex h-[26px] w-[360px] max-w-[40vw] items-center gap-2.5 rounded-md bg-hover px-2.5 text-[13px] text-muted-foreground"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search in project…</span>
        <span className="font-mono text-xs">Ctrl K</span>
      </button>

      <button
        type="button"
        className={barButton}
        disabled={analyzing}
        onClick={() => void reanalyze()}
      >
        {analyzing ? "Analyzing…" : "Re-analyze"}
      </button>

      <button
        type="button"
        className={barButton}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        {theme === "dark" ? "Light" : "Dark"}
      </button>
    </header>
  );
}
