# Tennessee Animal Abuse Registry Search

This is a static searchable public aid for the Tennessee Animal Abuse Registry. It reads public information from the official Tennessee Bureau of Investigation page and generates `public/registry.json`, which the website searches in the browser.

Official source: <https://www.tn.gov/tbi/tennessee-animal-abuse-registry.html>

Registry law: <https://www.tn.gov/content/dam/tn/tbi/documents/PC0413_-_Tennessee_Animal_Abuser_Registration_Act.pdf>

## How it works

- `scripts/update-registry.mjs` downloads the official TBI registry page.
- The script parses the public records and writes `public/registry.json`.
- `public/index.html`, `public/styles.css`, and `public/app.js` make the searchable site.
- `.github/workflows/update-registry.yml` runs the update automatically every day and commits changes.

The public website has no form and no writable database. Visitors cannot add or remove records.

## Local use

Run this once to refresh the data:

```bash
npm run update:data
```

Run the website locally:

```bash
npm run serve
```

## Add FOLCA and donation links

Open `public/app.js` and replace these two values:

```js
const FOLCA_WEBSITE_URL = "#";
const FOLCA_DONATION_URL = "#";
```

For example:

```js
const FOLCA_WEBSITE_URL = "https://example.org";
const FOLCA_DONATION_URL = "https://example.org/donate";
```

If either value is `"#"`, that button is hidden.

## Deploy for free on Cloudflare Pages

1. Create a GitHub account.
2. Create a new public GitHub repository.
3. Upload this project to that repository.
4. Create a Cloudflare account.
5. In Cloudflare Pages, choose "Connect to Git".
6. Select the GitHub repository.
7. Use these settings:
   - Framework preset: None
   - Build command: leave blank
   - Build output directory: `public`
8. Deploy.

Cloudflare will give you a free `pages.dev` URL. You can add a custom domain later.

## Important operating note

The TBI disclaimer should stay visible on the site. This tool should be treated as a search aid only, and adoption groups should verify any possible match against the official TBI registry before making a final decision.
