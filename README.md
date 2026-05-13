# Ban List Importer (For Twitch)

Ban List Importer is a Chrome extension for adding many Twitch blocked terms or phrases from a pasted list. It is intended for moderators and channel owners who maintain larger safety lists and want to avoid adding terms one at a time in the Twitch dashboard.

This is an experimental tool that is not sponsored, endorsed, administered by, or associated with Twitch Interactive. Twitch dashboard markup changes can break it.

## Use

1. Open the Twitch blocked terms page:
   `https://dashboard.twitch.tv/u/YOURUSERNAME/settings/moderation/blocked-terms`
2. Click the purple ban hammer extension icon in Chrome.
3. Paste terms separated by commas or new lines.
4. Choose whether all imported terms should be **Public** or **Private**.
5. Click **Ban!**
6. Keep the Twitch tab open while the import runs.

Existing visible terms are skipped. This does not delete or overwrite existing blocked terms; delete terms from Twitch normally if needed.

## Local Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.
5. Pin the extension if you want the ban hammer visible in the toolbar.

## Package

Create a Chrome Web Store upload zip:

```sh
npm run package
```

The package is written to `dist/ban-list-importer-v<version>.zip` and includes only the extension files required by Chrome.

## Development

There is no build step. The extension is plain HTML, CSS, JavaScript, and a Manifest V3 `manifest.json`.

Useful checks:

```sh
node --check banListImporter.js
node --check popup.js
jq empty manifest.json
npm run package
```

## Ideas

- Better progress reporting while a large list is importing.
- Options for deleting all blocked terms.
- Export the current block list to CSV.
- Better handling for Twitch UI changes.
