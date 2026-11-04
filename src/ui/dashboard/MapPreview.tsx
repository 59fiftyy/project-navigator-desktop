import { useMemo } from "react";

import type { ProjectContext } from "@/engine";
import { folderRole, topLevelFolders } from "@/app/dashboardInsights";
import { Panel } from "./Panel";
import { Button } from "@/components/ui/button";
import { potentialOrphans } from "@/engine/dependencies/dependencyScanner";

const W = 520;
const H = 260;

export function MapPreview({
  context,
  onOpen,
  onGraph,
  onFolder,
}: {
  context: ProjectContext;
  onOpen: () => void;
  onGraph?: () => void;
  onFolder?: (path: string) => void;
}) {
  const { folders, more } = useMemo(
    () => topLevelFolders(context.project.path, context.project.files),
    [context.project.path, context.project.files],
  );

  const nodes = [
    ...folders.map((f) => ({ label: f.name, count: f.count, role: folderRole(f.name) })),
    ...(more ? [{ label: `+${more} more`, count: -1, role: null }] : []),
  ];
  const rootX = 70;
  const rootY = H / 2;
  const colX = 330;
  const step = nodes.length > 1 ? (H - 40) / (nodes.length - 1) : 0;

  return (
    <Panel
      title="Project map"
      meta={`${nodes.length} roots · largest highlighted`}
      action="View full map"
      onAction={onOpen}
    >
      {nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files scanned.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Project map preview"
        >
          {nodes.map((node, i) => {
            const y = nodes.length > 1 ? 20 + i * step : rootY;
            return (
              <path
                key={`e-${node.label}`}
                d={`M ${rootX + 50} ${rootY} C ${rootX + 160} ${rootY}, ${colX - 110} ${y}, ${colX} ${y}`}
                fill="none"
                className={i === 0 ? "stroke-signal/70" : "stroke-border"}
                strokeWidth={1.25}
              />
            );
          })}

          <g>
            <rect
              x={rootX - 50}
              y={rootY - 16}
              width={100}
              height={32}
              rx={6}
              className="fill-surface-raised stroke-border"
            />
            <text
              x={rootX}
              y={rootY + 4}
              textAnchor="middle"
              className="fill-foreground text-[12px] font-medium"
            >
              {context.project.name.length > 14
                ? `${context.project.name.slice(0, 13)}…`
                : context.project.name}
            </text>
          </g>

          {nodes.map((node, i) => {
            const y = nodes.length > 1 ? 20 + i * step : rootY;
            const clickable = node.count >= 0;
            return (
              <g
                key={`n-${node.label}`}
                role={clickable ? "button" : undefined}
                aria-label={clickable ? `Open ${node.label} in the project map` : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={
                  clickable
                    ? () =>
                        onFolder
                          ? onFolder(
                              node.label === "(root)"
                                ? context.project.path
                                : `${context.project.path}/${node.label}`,
                            )
                          : onOpen()
                    : undefined
                }
                onKeyDown={
                  clickable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onFolder
                            ? onFolder(
                                node.label === "(root)"
                                  ? context.project.path
                                  : `${context.project.path}/${node.label}`,
                              )
                            : onOpen();
                        }
                      }
                    : undefined
                }
                className={clickable ? "cursor-pointer" : undefined}
              >
                <circle
                  cx={colX}
                  cy={y}
                  r={3.5}
                  className={i === 0 ? "fill-signal" : "fill-muted-foreground"}
                />
                <text x={colX + 12} y={y + 4} className="fill-foreground font-mono text-[11.5px]">
                  {node.label.length > 16 ? `${node.label.slice(0, 15)}…` : node.label}
                </text>
                {node.role ? (
                  <text x={colX + 150} y={y + 4} className="fill-muted-foreground text-[10.5px]">
                    {node.role}
                  </text>
                ) : null}
                {clickable ? (
                  <text
                    x={W - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[11px] tabular-nums"
                  >
                    {node.count.toLocaleString()}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      )}
      {context.codeIntelligence ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {context.codeIntelligence.edges.length} connections ·{" "}
            {potentialOrphans(context.codeIntelligence).length} potential orphans
          </p>
          <Button size="sm" variant="ghost" onClick={onGraph}>
            View Graph
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
