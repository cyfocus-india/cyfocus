#!/usr/bin/env bash
# CyFocus — pre-deploy security check. Fails the build if a page would break or weaken the
# Content-Security-Policy (GitHub Pages can't send security headers, so the CSP lives in a
# <meta> tag on every page). Run locally from the site folder: bash .github/scripts/check-site.sh
set -uo pipefail
cd "$(dirname "$0")/../.."

fail=0
bad() { echo "::error::$*"; fail=1; }

pages=(*.html)
csp_ref=""
for f in "${pages[@]}"; do
  csp=$(grep -o '<meta http-equiv="Content-Security-Policy" content="[^"]*">' "$f" || true)
  [ -n "$csp" ] || bad "$f: missing the Content-Security-Policy meta tag"
  [ -z "$csp_ref" ] && csp_ref="$csp"
  [ "$csp" = "$csp_ref" ] || bad "$f: CSP differs from ${pages[0]} (keep every page identical)"
  head -c 400 "$f" | grep -q 'http-equiv="Content-Security-Policy"' || bad "$f: CSP meta must come straight after <meta charset>"
done
case "$csp_ref" in *unsafe-inline*|*unsafe-eval*|*"script-src *"*) bad "CSP must not allow unsafe-inline, unsafe-eval or wildcard scripts";; esac

# Markup the CSP would block (or that would need it loosened)
grep -noE '<script(\s[^>]*)?>' "${pages[@]}" | grep -vE '\ssrc="[^"]+"|type="application/ld\+json"' && bad "inline <script> found (move it to assets/js/)"
grep -nE '\son[a-z]+\s*=' "${pages[@]}" && bad "inline event handler (on*=) found"
grep -nE '\sstyle="' "${pages[@]}" && bad "inline style attribute found (use a class in style.css)"
grep -n '<style' "${pages[@]}" && bad "<style> block found (move it to style.css)"
grep -niE '(href|src|action)="\s*javascript:' "${pages[@]}" && bad "javascript: URL found"
grep -nE '(href|src)="http://' "${pages[@]}" && bad "plain-http link or resource found"

# GitHub Pages serves 404.html at any missing path, so its links and assets must be root-absolute
grep -oE '(href|src|action)="[^"]*"' 404.html | grep -vE '="(/|#|https://|mailto:)' && bad "404.html: relative URL (use /path so it works at any depth)"

# Keep the Internet Archive opt-out
grep -q '^User-agent: ia_archiver$' robots.txt && grep -q '^User-agent: archive.org_bot$' robots.txt || bad "robots.txt lost the archive.org opt-out"

# target=_blank must not hand the opener to the new page
grep -oE '<a [^>]*target="_blank"[^>]*>' "${pages[@]}" | grep -v 'noopener' && bad "target=_blank link without rel=noopener"

# DOM-XSS sinks are blocked by Trusted Types; keep the JS free of them
grep -nE '\.(inner|outer)HTML\s*\+?=|insertAdjacentHTML\s*\(|createContextualFragment|DOMParser|document\.write(ln)?\s*\(|\beval\s*\(|new Function\s*\(|set(Timeout|Interval)\s*\(\s*["'"'"']' assets/js/*.js && bad "HTML-injection or eval-style sink in JS (build DOM nodes instead)"

# Nothing secret-looking in the published files
grep -rnIE '(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[abp]-[A-Za-z0-9-]{10,})' \
  "${pages[@]}" assets .well-known robots.txt sitemap.xml site.webmanifest && bad "possible secret in a published file"

# security.txt must not be expired (RFC 9116)
exp=$(grep -oE '^Expires: [0-9T:.-]+Z' .well-known/security.txt | cut -d' ' -f2)
if [ -z "$exp" ]; then bad ".well-known/security.txt has no Expires field"
elif [ "$(date -u +%Y-%m-%dT%H:%M:%S)" \> "$exp" ]; then bad ".well-known/security.txt expired on $exp — renew it"; fi

if [ "$fail" -ne 0 ]; then echo "Security check failed."; exit 1; fi
echo "Security check passed: ${#pages[@]} pages."
