# GC Teleprompter — Architecture

## Goal
Lightweight, client-only teleprompter for pasted or `.txt` scripts. No database, auth, API routes, or secret-bearing environment variables.

## Stack
Next.js 14 App Router + TypeScript + Tailwind CSS. Client state is local React state; uploaded TXT is read in-browser and never transmitted.

## UX
Single command surface: script input → configure text size/speed → play/stop. Spacebar toggles playback only when the user is not typing in a form control. Responsive at mobile, tablet, and laptop widths.

## Security
No server data endpoints. CSP, frame protection, referrer policy, permissions policy, content-type sniffing protection, and HSTS are set in `next.config.mjs`. TXT upload is constrained to text MIME/extensions and 2 MB in-browser. Rendering uses textContent/React text nodes, never HTML injection.

## Acceptance criteria
- Paste/edit script
- Load TXT locally
- Font size and speed controls
- Play/stop with visible state
- Spacebar toggles outside editor/controls
- Responsive iPhone/iPad/laptop UI
- Footer links to UN Studios Instagram
- Build, lint, browser smoke test, HTTPS production verification
