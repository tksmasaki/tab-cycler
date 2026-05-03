# Tab Cycler

A Chrome extension that adds **MRU (Most Recently Used) tab cycling** with a vertical Vivaldi-style overlay.

Chrome's built-in `Ctrl+Tab` cycles tabs in tab order. This extension complements that with **MRU order** cycling, so you can quickly bounce between the tabs you've actually been using — without taking your hands off the keyboard.

## Features

- Cycle through tabs in **most-recently-used** order (per window)
- Vertical overlay with tab titles and favicons, shown on the active tab while cycling
- Auto-commit after a short pause (default 350ms), or `Esc` to cancel
- Configurable commit delay and favicon visibility

## Usage

| Action | Default shortcut |
| --- | --- |
| Cycle to next recently used tab | `Ctrl+Q` (macOS: `Control+Q`) |
| Cycle to previous recently used tab | `Ctrl+Shift+Q` (macOS: `Control+Shift+Q`) |
| Cancel | `Esc` |

You can rebind shortcuts at `chrome://extensions/shortcuts`.

## Constraints

- `Ctrl+Tab` is reserved by Chrome and cannot be reassigned to extensions. The default is `Ctrl+Q` (`Control+Q` on macOS).
- Vivaldi's "release the modifier to commit" model isn't possible with the Chrome extension command API. This extension uses an auto-commit timer instead — keep tapping the shortcut to advance, then stop and the highlighted tab activates.
- The overlay does not appear on `chrome://`, `chrome-extension://`, the Web Store, or `view-source:` pages because Chrome blocks content scripts there. Cycling itself still works on these pages, just without the visual overlay.

## Development

Node 22 is pinned via [`mise`](https://mise.jdx.dev/) ([.mise.toml](.mise.toml)). With `mise` installed, run `mise install` first; otherwise install Node 22 with your preferred manager.

```sh
npm install
npm run dev        # Vite dev server with HMR
npm run build      # production build → dist/
npm run typecheck  # tsc --noEmit
```

Load the unpacked extension:

1. Visit `chrome://extensions/`
2. Toggle **Developer mode** on
3. Click **Load unpacked** and select the `dist/` directory

## Architecture

- **Service worker** ([src/background/](src/background/)) — tracks per-window tab activation history in `chrome.storage.session`, listens for keyboard commands, runs the cycle state machine, and commits after the auto-commit timer expires. Falls back to `chrome.scripting.executeScript` to inject the content script for tabs that predate the install or for pages where `content_scripts` did not match.
- **Content script** ([src/content/](src/content/)) — renders the overlay inside a closed Shadow DOM on the active tab, forwards `Esc` to cancel, and auto-hides via a heartbeat timer if the service worker stops responding.
- **Options page** ([src/options/](src/options/)) — configures the commit delay (50–2000ms) and favicon visibility, and resets MRU history.

## Permissions

- `tabs`, `storage` — query tabs and persist MRU/settings.
- `scripting` + `host_permissions: ["<all_urls>"]` — inject the overlay content script into the active tab when needed.
