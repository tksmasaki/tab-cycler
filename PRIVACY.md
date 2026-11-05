# Privacy Policy for Tab Cycler

Tab Cycler does not collect, store, or transmit any personal data to any external server.

The extension stores only the following data **locally in your browser**:

- Tab activation history (used to determine most-recently-used order, per window)
- Your settings (commit delay and favicon visibility)

This data is stored using Chrome's `storage` API. It never leaves your device and is removed when you uninstall the extension.

Tab Cycler does not use analytics, tracking, advertising, or remote code of any kind.

## Permissions

| Permission | Purpose |
| --- | --- |
| `storage` | Persist MRU tab order and user settings locally in the browser. |
| `scripting` + `host_permissions: <all_urls>` | Read the titles and favicons of open tabs (or the URL when a tab has no title) only to display them in the overlay, inject the overlay UI into the currently active tab, and detect in the page and its frames whether `Ctrl` is held or `Esc` is pressed while cycling. The extension checks only these keys, records no keystrokes, reads no page content, and sends no data. |

## Contact

For questions or concerns, open an issue at the project repository.
