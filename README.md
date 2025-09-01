# Crypto Card Ranker (modular, static)

A tiny static site that loads a published Google Sheet and renders a filterable grid (Passport Index vibe). No backend required.

## Structure

```
/assets/styles.css          # UI styles
/index.html                 # markup + PapaParse CDN + module entry
/src/app.js                 # app bootstrap & events
/src/config.js              # your Sheet URL + column aliases + sample data
/src/net.js                 # fetch with timeout, dual CSV endpoints, fallback
/src/parse.js               # CSV -> normalized rows
/src/store.js               # tiny global state
/src/tests.js               # built-in tests
/src/ui.js                  # rendering & UI helpers
/src/utils.js               # URL builders, parsing helpers
```

## Configure your sheet

Edit `src/config.js`:

```js
export const SHEET_PUBHTML_URL = '<<your publish-to-web URL (pubhtml)>>';
```

**Important:** In Google Sheets, use **File → Share → Publish to the web**. The app converts your `pubhtml` link to CSV internally.

## Run locally

Just open `index.html` in a browser. If your browser restricts `file://` + fetch, serve it:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Tests

Click **Run Tests** (top-right) to run simple self-tests for URL building, parsing, and normalization. Output appears under “Diagnostics”.

## Sorting “Rewards”

Currently the sort attempts numeric extraction (e.g., `2%`, `$50`). If your rewards are complex like “Tiered up to 3% + perks”, tell me your expected behavior and I’ll implement a smarter parser or use a dedicated numeric `Rewards_Score` column.

## Troubleshooting

- If you see a yellow status: the Google Sheet was unreachable; the app shows a small embedded sample to keep the UI alive. Check publish settings, connectivity, or CORS.
- Make sure your sheet has header names that roughly match the aliases in `src/config.js`.
