# bharathgaddam.com — 2026 site

Static, fully animated portfolio plus a private editor at `/admin`.

- **Deploy:** upload the contents of `dist/` (or `dist` zipped) to the Cloudflare Pages project for bharathgaddam.com. No build step needed on the host.
- **Edit content:** go to `/admin`, sign in as bharathgaddam89@gmail.com, edit, then **Save & publish**. Content lives in Supabase (`site_content` table, `site` storage bucket), so changes go live without redeploying.
- **Change design/code:** edit `src/` (`style.css`, `body.html`, `app.js`, `admin.js`, `admin.css`), then run `python3 build.py` and redeploy `dist/`.
- `src/content.json` is the built-in fallback content, used if the database can't be reached.
