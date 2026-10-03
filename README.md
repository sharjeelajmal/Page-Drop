# PageDrop

Upload a single HTML file or a ZIP of a static site, add images, and get a public URL like `https://pages.example.com/summer-sale`.

## Setup

```bash
npm install
cp .env.example .env   # fill in MongoDB + Cloudinary values
npm run dev
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | Project metadata and Cloudinary URLs. No file contents are stored here. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | yes | File storage. Used only on the server. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | yes | Dashboard login at `/login`. Change them in `.env` and restart the server. |
| `PRIVATE_USERNAME`, `PRIVATE_PASSWORD` | no | Second login that also sees **locked** projects and can lock/unlock them. The admin login never sees locked projects. |
| `AUTH_SECRET` | recommended | Long random string that signs login sessions. Changing it signs everyone out. |
| `NEXT_PUBLIC_APP_URL` | no | Fixed base URL for generated links. Leave empty to use the domain the app is opened on, so the same config works on localhost and in production. |

## How it works

```
Upload .html/.zip → validate → extract in memory → upload files to Cloudinary
  → save metadata in MongoDB → /<slug>/ serves the site
```

- **Storage.** Project files go to `html-pages/<projectId>/site/<path>` in Cloudinary. Images are stored as image resources. HTML, CSS, JS, fonts and other files are stored as raw resources. Assets uploaded separately go to `html-pages/<projectId>/<name>`.
- **Serving.** Public links live at the site root (`/<slug>`). A `fallback` rewrite in `next.config.ts` sends them to `app/p/[slug]/[[...path]]/route.ts`. Fallback rewrites only apply when no page, API route or public file matched, so `/login`, `/projects` and `/api` are unaffected. Old `/p/<slug>` links keep working. The route serves the project as a standalone document; it never renders through React. `/abc123` redirects to `/abc123/` so that relative paths like `./style.css` resolve correctly, which is why `next.config.ts` sets `skipTrailingSlashRedirect`. Names used by the app (`login`, `projects`, `api`, …) are reserved and can't be chosen as links.
- **Reference rewriting.** When HTML and CSS are served, image references (`src`, `srcset`, `url()`, inline styles) are pointed directly at Cloudinary. Root-relative links (`/css/app.css`) are rewritten to the project's own path.
- **Assets.** Uploaded images are matched to references by file name (case-insensitive). They override a file with the same name from the ZIP. Uploading the same name again replaces the asset.
- **Shared logos.** Images listed in `SHARED_PUBLIC_ASSETS` (`lib/config.ts`, currently `logo.png` and `logo2.png`) are served from the app's `/public` folder. Any project can use them by file name without uploading. Lookup order: uploaded asset → file in the project → shared logo.
- **Libraries and icons.** Published pages are static, so nothing is installed with npm. Load libraries from a CDN with `<link>`/`<script>` (Font Awesome, Lucide, Tailwind CDN, Bootstrap Icons, …) or include their files in the ZIP. Both work inside the sandbox.
- **ZIP handling.** The shallowest `index.html` sets the project root, so `website/index.html` works without re-zipping. Hidden files, `__MACOSX`, and non-static file types (`.php`, executables, …) are skipped and reported as warnings.
- **Clean URLs.** `/about` serves `about.html`, `/docs` redirects to `/docs/` (which serves `docs/index.html`), and a `404.html` in the project is used for missing paths.

## Pages

- `/login`: admin sign-in. Credentials come from `.env`.
- `/`: deploy a new HTML/ZIP and upload assets. You can choose the project link (e.g. `/summer-sale`) or leave it empty for a random one. Availability is checked as you type.
- `/projects`: every published project, with search, filters, grid and list views, and a details drawer. Projects can be renamed, redeployed with new files (the URL stays the same) or deleted, which also removes their Cloudinary files.
- `/<slug>`: the public pages. These need no login. The older `/p/<slug>` form still works.

## Accounts and locked projects

- **Admin** (`ADMIN_*`): sees and manages every *unlocked* project. Locked projects are invisible to it everywhere: lists, details, rename, redeploy, assets and delete all return 404.
- **Private** (`PRIVATE_*`, optional): sees everything. On the Projects page, a **Locked** button next to "New deployment" opens the locked vault, and any project can be locked or unlocked from its card. Projects deployed from this login are locked by default (the "Lock this project" switch on the deploy page).
- Public links of locked projects keep working. Locking only hides them from the admin dashboard.

## Performance

- The Projects page renders its first list on the server (streamed with a skeleton), so there is no client-side fetch waterfall.
- Card previews load lazily, at most two at a time.
- Public pages: project data is cached in memory (15 s, cleared on every change), and Cloudinary file bodies are cached by their immutable URL. Responses carry ETags, so repeat visits get `304 Not Modified`. Concurrent lookups for the same page share one database query.
- `instrumentation.ts` opens the MongoDB connection when the server starts.

## Security

- Every response from a published page carries the CSP sandbox, not just HTML, so uploaded `.xml`/`.svg` files opened directly cannot run script on this origin.
- Admin pages send `X-Frame-Options: DENY`, `frame-ancestors 'none'`, HSTS, nosniff, Referrer-Policy, Permissions-Policy and `X-Robots-Tag: noindex`.
- Login: the request body is capped at 4 KB, and failures are rate-limited per IP, per username and globally. The post-login redirect only accepts same-site paths. The session cookie is `Secure` behind HTTPS proxies too.
- Uploads must declare `Content-Length`, so size limits are enforced before buffering.
- The dashboard, the projects page and every `/api/projects*` route need a session. That is a signed, httpOnly cookie that lasts 7 days. `proxy.ts` redirects pages to `/login`, and each API route checks the session itself. Failed logins are rate-limited.

- Allow-listed file types, content sniffing (magic bytes) and size limits (see `lib/config.ts`).
- ZIP entries with absolute paths or `..` are rejected. Nothing is written to the server filesystem.
- Declared entry sizes are checked before extraction. Inflating never goes past the declared size, which limits ZIP bombs.
- Published HTML is served with `Content-Security-Policy: sandbox …` and without `allow-same-origin`. Page scripts therefore run in an opaque origin and cannot use the dashboard's origin. This is always on. The trade-off: published pages cannot use `localStorage` or cookies.
- Mutating API routes reject cross-origin browser requests, including requests from sandboxed pages, whose origin is `"null"`.

## Deployment notes

- Request body limits on your host apply. For example, Vercel functions accept bodies up to about 4.5 MB, which is smaller than the 50 MB ZIP limit here. Self-hosting or presigned uploads avoids this.
- Some Cloudinary accounts restrict delivery of PDF files by default. Enable it in Cloudinary's security settings if your sites include PDFs.

## Layout

```
proxy.ts                             Redirects signed-out visitors to /login
app/login, app/projects              Sign-in page, projects management page
app/page.tsx                         Dashboard
app/api/projects/…                   Upload project, get project, upload/delete assets
app/p/[slug]/[[...path]]/route.ts    Public pages (reached via /<slug>)
components/dashboard, components/ui  UI components
hooks/useProjectUpload.ts            Project upload state
lib/files/                           Path safety, MIME allow-list, signatures, ZIP extraction
lib/projects/                        Upload preparation, service layer, serialization
lib/publish/                         Path resolution, reference rewriting, response building
lib/models/Project.ts                Mongoose schema
```
