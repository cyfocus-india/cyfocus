# cyfocus.in

Source for [cyfocus.in](https://cyfocus.in): a static site (plain HTML, CSS and JavaScript, no build step) hosted on GitHub Pages.

## Layout

| Path | What it is |
| --- | --- |
| `*.html` | The 14 pages. Header, mobile menu and footer markup is repeated in each page, so change all of them together. |
| `404.html` | Shown by GitHub Pages for any missing URL. Use root-absolute paths (`/assets/...`) here. |
| `assets/css/style.css` | All styles, including the `u-*` utility classes that replace inline styles. |
| `assets/js/` | `boot.js` runs in `<head>` (HTTPS upgrade, framing guard, theme). `icons.js` builds the SVG sprite. `main.js` handles shared interactions, `contact.js` the contact form and `finance.js` the calculators. |
| `assets/fonts/` | Self-hosted Inter, JetBrains Mono and Space Grotesk (SIL OFL 1.1). |
| `.well-known/security.txt` | Vulnerability disclosure contact (RFC 9116). Renew `Expires` every year. |
| `.htaccess`, `_headers` | The same security headers for Apache or Cloudflare Pages/Netlify. GitHub Pages ignores them and they are not published. |

## Preview locally

```bash
python3 -m http.server 5174 --bind 127.0.0.1
```

Then open http://127.0.0.1:5174.

## Deploy

Every push to `main` runs `.github/workflows/static.yml`:

1. `.github/scripts/check-site.sh` checks the pages and stops the deploy if anything would break or weaken the security policy.
2. Only the public files are copied into `_site/` and published.

Run the check yourself before pushing:

```bash
bash .github/scripts/check-site.sh
```

## Security rules

Each page carries a strict Content-Security-Policy in a `<meta>` tag (GitHub Pages can't send headers). To keep it working:

- No inline `<script>`, `on*=` handlers, `style=""` attributes or `<style>` blocks. Put code in `assets/js/` and styles in `style.css`.
- No `innerHTML`, `insertAdjacentHTML` or `DOMParser` in JavaScript. Build DOM nodes instead; Trusted Types is enforced.
- Nothing loads from other sites except the Google Maps frame on the Contact page. A new third-party resource needs the CSP updated in every page, `.htaccess` and `_headers`.
- After changing `style.css` or any JS file, bump the `?v=` version on its `<link>`/`<script>` tags in every page.
