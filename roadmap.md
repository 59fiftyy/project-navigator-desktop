# Current update

- [ ] Replace Dashboard map preview with expandable full file tree; keep only TopBar Re-analyze.
- [ ] Add confirmed, real documentation deletion with incremental refresh and regression tests.
- [ ] Stabilize dependency selection and highlight both connection directions.
- [ ] Add switchable complete project hierarchy graph with no inventory truncation.
- [ ] Add concise explanations for graph types, insights and impact.
- [ ] Run regression tests and exercise updated UI flows.

- [x] Fix custom documentation discovery and immediate refresh.
- [x] Show explicit task totals, five open tasks, expandable list, content-sized panel.
- [x] Fix concurrent LOC counting and surface unreadable-file uncertainty.
- [x] Add static dependency analysis, impact traversal and conservative orphan detection.
- [x] Add Project Map Graph and Insights while preserving the full virtualized tree.
- [x] Add Dashboard dependency statistics and Graph navigation.
- [x] Run regression tests and verify the available desktop boundary: 23 tests pass; lint has zero errors; browser UI exercised using real temporary files through a test-only native IPC adapter, with no application mocks added.
- [ ] Verify packaged Tauri runtime on Windows/Linux — blocked by unavailable native desktop window in this sandbox; browser IPC verification does not establish native packaging or OS actions.