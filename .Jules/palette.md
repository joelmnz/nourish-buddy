
## 2026-02-07 - [Toggle Button Accessibility]
**Learning:** Visual toggle states (like `btn-primary` vs `btn-ghost`) are invisible to screen readers without programmatic state.
**Action:** Always add `aria-pressed={condition}` to toggle buttons that don't change their label.
