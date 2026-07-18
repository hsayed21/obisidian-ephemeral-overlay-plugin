# Changelog

All notable changes to Ephemeral Overlay are documented here.

## 1.1.0

### Added

- Remembered color, stroke width, and fade mode.
- Movable, responsive iPad toolbar that collapses to a pencil button.
- Edge docking with automatic vertical side layouts and horizontal top/bottom layouts.
- Apple Pencil pressure sensitivity and adjustable stroke smoothing.
- Automated behavior tests, release validation, and tagged-release workflow.

### Fixed

- Finger scrolling now remains native and clears drawings when **Clear on scroll** is enabled.
- Mouse-wheel and trackpad scrolling no longer get blocked by drawing mode.
- Desktop drawing shortcuts no longer intercept normal note typing.
- Single-point strokes, Retina rendering, active-pointer cancellation, and fade-mode changes.
- Overlay cleanup when switching notes, resizing, hiding the app, or unloading the plugin.
- Collapsed-toolbar dragging no longer leaks swipe or sidebar gestures to Obsidian.

### Changed

- Minimum supported Obsidian version is 1.1.0.
- Input handling and settings validation are separated into focused modules.

## 1.0.0

- Initial temporary drawing overlay with colors, widths, and fade modes.
