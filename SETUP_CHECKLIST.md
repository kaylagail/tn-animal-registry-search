# Setup Checklist

Use this after creating your GitHub and Cloudflare accounts.

## 1. Create the GitHub repository

1. Go to <https://github.com/new>.
2. Repository name: `tn-animal-registry-search`.
3. Visibility: Public.
4. Do not add a README, license, or `.gitignore` on GitHub if you are uploading this folder.
5. Create the repository.

## 2. Upload this project

Upload the contents of this folder:

`C:\Users\kayla\pai\tn-animal-registry-search`

Make sure GitHub includes these important paths:

- `.github/workflows/update-registry.yml`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/registry.json`
- `scripts/update-registry.mjs`
- `README.md`

## 3. Turn on the automatic update

1. Open the repository on GitHub.
2. Click the Actions tab.
3. If GitHub asks whether to enable workflows, enable them.
4. Click "Update registry data".
5. Click "Run workflow" to test it once.

After that, it will run daily.

## 4. Deploy on Cloudflare Pages

1. Go to the Cloudflare dashboard.
2. Go to Workers & Pages.
3. Click Create application.
4. Choose Pages.
5. Choose Connect to Git.
6. Select the GitHub repository.
7. Use these deploy settings:
   - Framework preset: None
   - Build command: leave blank
   - Build output directory: `public`
8. Click Save and Deploy.

Cloudflare will give you a free URL ending in `.pages.dev`.

## 5. Add FOLCA and donation links

When you have the real URLs, edit `public/app.js`.

Replace:

```js
const FOLCA_WEBSITE_URL = "#";
const FOLCA_DONATION_URL = "#";
```

with the real links.

## 6. Before sharing publicly

Check these things:

- The search page loads.
- The official TBI disclaimer appears near the top.
- The "Official TBI registry" link works.
- A search for a known name returns the correct record.
- The data sync date appears under "Search Registry".

This site should stay a public search aid. The official source remains the Tennessee Bureau of Investigation.
