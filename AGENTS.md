<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules
- Colours live only as CSS variables in `src/styles.css` (`.dark` default, `.light`); components use semantic classes (`bg-surface`, `bg-hover`, `bg-selected`, `text-signal`) so both themes stay in sync.
- The app shell is TopBar + Sidebar + keep-alive panes + StatusBar in `App.tsx`; screens never own global chrome, so navigation keeps each screen's state.
- Pure product rules (doc ordering/paths, brief, theme default) are covered by Vitest tests in `src/app/*.test.ts`; run `bunx vitest run`.
