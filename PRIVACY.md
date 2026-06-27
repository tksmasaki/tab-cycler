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
| `tabs` | Enumerate open tabs and activate the selected tab. Tab titles and favicons are read only to display them in the overlay. |
| `storage` | Persist MRU tab order and user settings locally in the browser. |
| `scripting` + `host_permissions: <all_urls>` | Inject the overlay UI into the currently active tab. The extension reads no page content and sends no data. |

## Contact

For questions or concerns, open an issue at the project repository.
