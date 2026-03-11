# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-03-11

### Added
- Global admin toast system with typed variants (`success`, `error`, `info`) and shared composable API.
- Global admin confirmation dialog service for destructive/reset actions.
- New reusable UI components for toast and confirm dialog mounting at app level.
- Toast showcase section in Kitchen Sink with live success/info/error triggers.

### Changed
- Admin topbar now supports inline toast presentation and sticky behavior for persistent feedback visibility.
- Admin menu model expanded to support depth-3 hierarchy (`parent > child > grandchild`).
- Sidebar navigation rendering updated for recursive active/open behavior across nested levels.
- `/admin/menus` redesigned to support reorder + hide controls at group/item/child/grandchild levels.
- Compact sidebar mode added and moved into topbar settings dropdown.
- Core action flows updated to use toast + confirm patterns (save, delete, upload, reset/hide-risk actions).

### Backend & Contracts
- `adminMenuPrefs` schema expanded with nested preference fields:
  - `childOrder`
  - `grandchildOrder`
  - `hiddenChildren`
  - `hiddenGrandchildren`
- Backward compatibility maintained for previously stored menu preferences.

### UX Polish
- Refined topbar toast motion, timing, and title/visibility choreography.
- Updated spacing/alignment behavior for site title/profile/topbar elements.

[1.1.0]: https://github.com/mfauzzury/corrad-xpress/releases/tag/v1.1.0
