import { describe, expect, it } from "vitest";

import { mergeActivity, parseTasks, toggleTask, topLevelFolders } from "./dashboardInsights";

const md = "# Now\n- [ ] Build map\n- [x] Theme\n- Plain item\n```\n- not a task\n```\n";

describe("dashboard tasks", () => {
  it("reads open and done checklist items, plain bullets as open", () => {
    const tasks = parseTasks(md);
    expect(tasks.map((t) => [t.text, t.done])).toEqual([
      ["Build map", false],
      ["Theme", true],
      ["Plain item", false],
    ]);
    expect(tasks[0].section).toBe("Now");
  });

  it("toggling changes only that line", () => {
    const next = toggleTask(md, 1);
    const before = md.split("\n");
    const after = next.split("\n");
    expect(after[1]).toBe("- [x] Build map");
    after.forEach((line, i) => i !== 1 && expect(line).toBe(before[i]));
    expect(toggleTask(md, 3).split("\n")[3]).toBe("- [x] Plain item");
  });
});

describe("map preview folders", () => {
  it("counts per top folder and groups the rest as more", () => {
    const files = ["src/a", "src/b", "docs/c", "x", "e/1", "f/1"].map((p) => ({
      path: `/p/${p}`,
      name: p,
      extension: "",
    }));
    const { folders, more } = topLevelFolders("/p", files, 2);
    expect(folders[0]).toEqual({ name: "src", count: 2 });
    expect(folders).toHaveLength(2);
    expect(more).toBe(3);
  });
});

describe("activity", () => {
  it("orders newest first", () => {
    const items = mergeActivity(
      [{ id: "a", kind: "commit", title: "a", at: 1 }],
      [{ id: "b", kind: "doc", title: "b", at: 5 }],
    );
    expect(items.map((i) => i.id)).toEqual(["b", "a"]);
  });
});
