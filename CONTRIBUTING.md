# Contributing

## Set up

Use Node.js 18 or newer and npm:

```bash
npm ci
npm test
npm run lint
npm run build
npm run verify-release
```

Keep `src/main.ts` focused on plugin lifecycle. Put input, rendering, toolbar, and settings behavior in their existing focused modules. Do not commit generated `main.js` or `node_modules/`.

## Manual input test matrix

Test the production build in both editing and reading modes where applicable.

| Device/input | Required check |
| --- | --- |
| iPad Pro + Apple Pencil | Pencil draws; pressure changes width; finger does not draw |
| iPad finger | Note scrolls normally; **Clear on scroll** clears before scrolling continues |
| iPad split view/rotation | Toolbar stays on-screen, moves, collapses, and reopens |
| Desktop mouse | Mouse draws when pen-only mode is off |
| Desktop wheel/trackpad | Note scrolls normally; clear-on-scroll works without blocking |
| Desktop keyboard | Typing in the editor is unchanged; shortcuts work outside editable fields |

Also verify that switching notes or disabling the plugin removes the canvas, toolbar, cursor, event listeners, and temporary drawing state.

## Pull requests

- Keep changes local/offline unless a feature explicitly requires and discloses a service.
- Add or update tests for pure input, settings, or stroke logic.
- Update `CHANGELOG.md` for user-visible changes.
- Do not change the stable plugin ID, `ephemeral-overlay`.
