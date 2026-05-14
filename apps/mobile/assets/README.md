# Mobile assets

`app.json` expects:

- `icon.png` (1024 × 1024)
- `splash.png` (1242 × 2436)
- `adaptive-icon.png` (1024 × 1024, foreground)

These are intentionally not checked in — generate them from the brand kit
before the first store submission. `expo prebuild` will fail loudly if any
required asset is missing.
