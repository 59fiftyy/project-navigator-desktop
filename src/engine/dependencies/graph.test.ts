import { describe, expect, it } from "vitest";
import { directConnections, impactedFiles, isHighlightedConnection } from "./graph";

describe("graph selection", () => {
  const edges = [
    { source: "app.ts", target: "service.ts" },
    { source: "service.ts", target: "helper.ts" },
    { source: "other.ts", target: "app.ts" },
  ];
  it("includes both imports and importers when a file is selected", () => {
    expect([...directConnections(edges, "service.ts")].sort()).toEqual(["app.ts", "helper.ts"]);
  });
  it("highlights every direct connection in both directions", () => {
    const affected = impactedFiles(edges, "service.ts");
    expect(isHighlightedConnection(edges[0], "service.ts", affected)).toBe(true);
    expect(isHighlightedConnection(edges[1], "service.ts", affected)).toBe(true);
    expect(isHighlightedConnection(edges[2], "service.ts", affected)).toBe(true);
    expect(isHighlightedConnection(edges[1], null, affected)).toBe(false);
  });
  it("does not confuse outgoing imports with potential change impact", () => {
    expect([...impactedFiles(edges, "service.ts")].sort()).toEqual(["app.ts", "other.ts"]);
  });
});
