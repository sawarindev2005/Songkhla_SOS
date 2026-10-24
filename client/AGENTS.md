<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Public map details

- `src/components/pk/MapSheet.jsx` owns sheet height and scrolling. A changed `detailKey` opens the detail at full height and resets its scroll position; returning to the list restores half height.
- Place detail actions use `PlaceActions` from `PublicDetail.jsx`, passed through the sheet's `footer` in `PlaceList.jsx` and the public overview page. Keep phone/directions outside the scrolling body so they remain visible on short mobile screens. Collapsing the sheet hides the footer.
- When the mobile sheet hides its floating toolbar at full height, remove that toolbar from layout so it does not consume detail space.
- Toolbar visibility uses responsive CSS, without `aria-hidden`: desktop GPS/emergency controls remain available to assistive technology when mobile controls are hidden.
- While an overview detail is open on mobile, hide the layer-filter row to leave map space between the news ticker and detail sheet. Returning to the overview restores the filters; desktop keeps them visible.
- Public map focus supplies `coverElements` for the sheet and top overlays. `FlyTo` measures actual occlusion and realigns after geometry settles for 200ms, including sheet transitions and viewport changes.
- `HotlineFab` measures and clamps its popup to the visible viewport and safe-area padding, updates while open on resize/rotation, and scrolls the phone list when the screen is short.
- Verification: `npm run build`; targeted lint with `node node_modules/eslint/bin/eslint.js <changed files>`. Check `/distributions`, `/shelters`, and overview map selection at 360x640 and 390x844: opening/reopening details must show a tappable directions link above bottom navigation without scrolling, including after choosing a lower list row.
- Also check selected markers remain between the ticker and detail sheet after animation; desktop full details expose GPS/emergency controls in the accessibility tree; opening the emergency menu from a full-height list keeps its heading/close control inside the viewport, including rotation while open and a 320x220 scrolling-list check.
