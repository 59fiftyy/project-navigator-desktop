import { FolderOpen, RotateCw, X } from "lucide-react";

import { useProject } from "@/app/projectStore";
import { documentationCount } from "@/app/projectInsights";
import { ENGINE_STAGES } from "@/engine";
import { ScreenHeader } from "@/ui/layout/ScreenHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right font-mono text-xs text-foreground/90">{value}</span>
    </div>
  );
}

export function SettingsScreen() {
  const { context, projectPath, desktop, lastAnalyzedAt, chooseProject, reanalyze, clearProject } =
    useProject();

  return (
    <div className="pb-12">
      <ScreenHeader title="Settings" description="Project and runtime information" />

      <div className="max-w-2xl space-y-5 px-8 py-6">
        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm font-medium">Current project</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <Row label="Name" value={context?.project.name ?? "—"} />
            <Row label="Path" value={projectPath ?? "—"} />
            <Row label="Type" value={context?.analysis.projectType ?? "—"} />
            <Row label="Files" value={String(context?.analysis.totalFiles ?? 0)} />
            <Row
              label="Documentation files"
              value={String(context ? documentationCount(context) : 0)}
            />
            <Row
              label="Last analyzed"
              value={lastAnalyzedAt ? lastAnalyzedAt.toLocaleString() : "—"}
            />

            <Separator className="my-4" />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void chooseProject()}>
                <FolderOpen className="size-4" />
                Choose another project
              </Button>
              <Button size="sm" onClick={() => void reanalyze()} disabled={!projectPath}>
                <RotateCw className="size-4" />
                Re-analyze project
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void clearProject()}>
                <X className="size-4" />
                Close project
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm font-medium">Runtime</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <Row label="Runtime" value={desktop ? "Tauri desktop" : "Browser preview"} />
            <Row label="Filesystem" value={desktop ? "Native (Rust commands)" : "Unavailable"} />
            <Row label="Engine stages" value={String(ENGINE_STAGES.length)} />

            <Separator className="my-4" />

            <div className="flex flex-wrap gap-1.5">
              {ENGINE_STAGES.map((stage) => (
                <Badge key={stage.id} variant="outline" className="text-xs">
                  {stage.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
