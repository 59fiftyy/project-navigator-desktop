import { useMemo } from "react";

import { useProject } from "@/app/projectStore";
import { parseRoadmap } from "@/app/projectInsights";
import { ScreenHeader, EmptyHint } from "@/ui/layout/ScreenHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RoadmapScreen() {
  const { context } = useProject();
  const roadmap = context?.understanding.roadmap ?? null;
  const sections = useMemo(() => parseRoadmap(roadmap), [roadmap]);

  if (!context) return null;

  return (
    <div className="pb-12">
      <ScreenHeader
        title="Roadmap"
        description="Extracted by the Atlas Engine from this project's Roadmap.md"
      />

      <div className="space-y-4 px-8 py-6">
        {sections.length === 0 ? (
          <EmptyHint>
            This project has no Roadmap.md, so the engine found nothing to extract.
          </EmptyHint>
        ) : (
          sections.map((section, index) => (
            <Card key={`${section.title}-${index}`} className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm font-medium text-foreground">
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                {section.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {section.items.map((item, itemIndex) => (
                      <li key={`${item}-${itemIndex}`} className="flex gap-2">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                        <span className="text-foreground/85">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
