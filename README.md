# Ephemeral Overlay

Draw temporary freehand annotations over an Obsidian note without changing the note or saving the drawing. It is designed for presentations, teaching, reviews, and quick visual thinking on iPad and desktop.

## iPad workflow

1. Enable the plugin and open **Settings → Ephemeral Overlay**.
2. Enable **Clear on scroll** if every finger scroll should remove the current drawing.
3. Optionally enable **Pen only mode** to reject mouse or trackpad drawing input.
4. Select the pencil icon in the note header, ribbon, or command palette.
5. Draw with Apple Pencil. Scroll and interact with the note normally using a finger.

Finger touches are never treated as drawing input. With **Clear on scroll** enabled, the drawing clears at the start of a finger scroll and the note continues scrolling normally. On desktop, the mouse wheel and trackpad behave the same way; scrolling is not blocked.

## Features
- **Freehand Drawing** - Draw directly on top of your Markdown notes
- **Multi-Input Support** - Works with mouse, touch, and Apple Pencil
- **Color Options** - Six vibrant colors: red, yellow, blue, green, orange, pink
- **Adjustable Pen Width** - 5 different sizes (2px to 16px)
- **Auto-Fade Modes** - Strokes automatically disappear (1s, 3s, 5s, 7s)
- **Mobile-Friendly** - The iPad toolbar moves, collapses, docks vertically at the sides, and docks horizontally at the top or bottom
- **Pen-Only Mode** - Draw with Apple Pencil, scroll with finger simultaneously
- **Keyboard Shortcuts** - Quick access to all tools
- **Zero Persistence** - Drawings never saved, always temporary

## Open drawing mode

- Select the pencil in the note header.
- Select the pencil in the left ribbon.
- Run **Toggle drawing overlay** from the command palette.
- Assign your own hotkey to **Toggle drawing overlay** under **Settings → Hotkeys**.

The plugin intentionally does not install a default hotkey.

## Desktop controls

Keyboard shortcuts apply only when focus is outside an editable field, so normal note typing is not intercepted.

| Control | Action |
| --- | --- |
| `R`, `Y`, `B`, `G`, `O`, `P` | Select a color |
| `1`–`5` | Select a width from 2–16 px |
| `F` | Cycle the fade duration |
| `E` | Clear the drawing |
| `Esc` | Close drawing mode |
| `Ctrl` + mouse wheel | Fine-adjust stroke width |
| Mouse wheel or trackpad | Scroll normally; clear first when enabled |

## Installation

For a release installation, place these three release assets in `<Vault>/.obsidian/plugins/ephemeral-overlay/`:

- `main.js`
- `manifest.json`
- `styles.css`

Reload Obsidian, then enable **Ephemeral Overlay** under **Settings → Community plugins**.

## Development

Node.js 18 or newer and npm are required.

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run verify-release
```

Source code lives in `src/`. `main.js` is generated for releases and is intentionally not committed.

## Privacy

Ephemeral Overlay makes no network requests, includes no telemetry, and does not read or write note contents. Tool and toolbar preferences are stored in Obsidian's local plugin settings; drawings exist only in memory.

## Support and contributing

Before reporting an iPad issue, include the iPadOS version, Obsidian version, Apple Pencil model, note mode, and whether **Pen only mode** and **Clear on scroll** were enabled. See [CONTRIBUTING.md](CONTRIBUTING.md) for development and test guidance.

## License

[MIT](LICENSE)
