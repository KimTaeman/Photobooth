# Tatt n' Snap Photobooth

An event-ready digital photobooth that turns a live camera session into a framed photo strip, animated GIF, and optional video—then delivers the result through a mobile-friendly QR experience.

[Live web app](https://photobooth-teal-pi.vercel.app/) · [Source](https://github.com/KimTaeman/Photobooth)

## Overview

Tatt n' Snap was built for self-service event installations where guests need a fast, guided experience and operators need control without redeploying the application. It runs as both a Vercel-hosted React SPA and a Tauri desktop app, with Supabase providing live configuration and session records and Cloudinary handling generated media.

The application covers the complete booth workflow:

1. Unlock the kiosk and select an event frame.
2. Capture a four-photo sequence with configurable timing and filters.
3. Compose a high-resolution photo strip in the browser.
4. Generate a GIF and optionally record a video.
5. Upload media, create a share page, and display its QR code.
6. Download the finished assets locally or from another device.

## Key features

- Guided, touch-friendly kiosk flow with idle and lock screens
- Browser camera capture with graceful constraint fallbacks
- Configurable frames, layouts, countdowns, themes, filters, and consent copy
- High-resolution canvas composition for downloadable photo strips
- Client-side animated GIF generation and optional WebM recording
- Local Lottie stickers that guests can place on their result
- QR-based handoff to a responsive photo, GIF, and video download page
- Realtime operator dashboard backed by Supabase
- Tauri desktop packaging for Windows, macOS, and Linux
- Durable Tauri upload queue that retains captures during connectivity failures

## Architecture

```text
Camera / MediaRecorder (authenticated operator)
          │
          ▼
  Canvas composition ──► local photo, GIF, and video downloads
          │
          ├──► Supabase Edge Function ──► signed Cloudinary upload
          │                                  │
          │                                  └──► mobile share page + QR delivery
          └──► Supabase ────► settings + sessions + media lifecycle metadata
                 ▲
                 └────────── operator dashboard / realtime updates

Tauri only: failed uploads ──► AppCache queue ──► retry when online
```

Supabase stores operational data rather than media binaries. Cloudinary stores the generated assets, while the database records lightweight session and configuration data. This keeps database rows small and lets the media CDN handle delivery and transformation.

## Tech stack

| Area              | Technology                                       |
| ----------------- | ------------------------------------------------ |
| UI                | React 19, TypeScript, React Router, Lucide React |
| Web tooling       | Vite 8, ESLint                                   |
| Desktop           | Tauri 2, Rust                                    |
| Data and realtime | Supabase JavaScript client, Postgres             |
| Media delivery    | Cloudinary                                       |
| Media generation  | Canvas API, MediaRecorder, Gifshot               |
| Animation         | Lottie React with self-hosted JSON assets        |
| Hosting           | Vercel SPA deployment                            |

## Getting started

### Prerequisites

- Node.js 22 or newer
- [pnpm](https://pnpm.io/installation)
- A modern browser with camera access
- Rust and the [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/) for desktop development
- Supabase and Cloudinary projects for a fully independent deployment

### Install and run the web app

```bash
git clone https://github.com/KimTaeman/Photobooth.git
cd Photobooth
pnpm install
pnpm dev
```

Open `http://localhost:5173`. Camera access requires a secure context; browsers treat `localhost` as secure during development. Allow camera permission when prompted.

### Run the desktop app

After installing the Tauri prerequisites:

```bash
pnpm tauri:dev
```

### Configure external services

Copy the environment template before starting the application:

```bash
cp .env.example .env.local
```

Then provide:

| Value                    | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| Supabase project URL     | Database and realtime endpoint                      |
| Supabase publishable key | Public client access governed by Row Level Security |
| Cloudinary cloud name    | Media upload and delivery account                   |
| Public share URL         | Deployed web origin encoded into QR links           |

Vite embeds every `VITE_*` value into the client bundle. The Supabase publishable key and Cloudinary cloud name are public identifiers, not secrets. Never place a Supabase service-role key, Cloudinary API key/secret, signing secret, or cron secret in a Vite variable.

The authoritative schema and RLS policies live in `supabase/migrations/`. They require authenticated `operator` or `admin` roles for kiosk operation, permit only admins to inspect session data or change settings, and keep media lifecycle writes server-owned.

### Deploy Supabase security and media functions

Install the Supabase CLI, link the intended project, and apply the migration:

```bash
supabase login
supabase link --project-ref yzeorfygmubgyukeypsx
supabase db push
```

Create `supabase/.env.local` from `supabase/.env.example`, fill in the Cloudinary server credentials and allowed production origins, then deploy:

```bash
supabase secrets set --env-file supabase/.env.local
supabase functions deploy cloudinary-sign
supabase functions deploy cloudinary-complete
supabase functions deploy cloudinary-retention --no-verify-jwt
```

Invite operator and administrator accounts through Supabase Auth. Replace the placeholder emails in `supabase/bootstrap_roles.sql`, execute it once in the SQL editor, and have users sign out and back in to refresh their JWT role. Roles are stored in protected `app_metadata`, never editable client metadata.

Finally, replace the placeholders in `supabase/schedule_retention.sql` and run it once. The scheduled function removes expired Cloudinary assets every 15 minutes and marks their server-owned metadata as deleted. Keep the cron value identical to `RETENTION_CRON_SECRET`.

## Self-hosted and offline Lottie stickers

Sticker animations are deliberately stored as JSON in `public/stickers/` and registered in `src/constants/sticker.tsx`. They are served with the application instead of being fetched from a third-party animation CDN.

This approach provides:

- Predictable animation availability at live events
- No third-party sticker request or runtime tracking
- Faster repeat loads through normal browser caching
- Offline sticker rendering in the packaged Tauri application

To add a sticker:

1. Export or download a licensed Lottie JSON animation.
2. Place it in `public/stickers/`.
3. Add its label and root-relative path to `src/constants/sticker.tsx`.
4. Verify it at `/#/sticker-test` before using it at an event.

```ts
export const STICKERS = [{ label: '🎉 Confetti', src: '/stickers/confetti.json' }];
```

Self-hosting makes the sticker UI offline-capable, but Cloudinary uploads, Supabase settings, and QR delivery still require a network connection. In the Tauri build, failed media uploads are stored under the app cache and retried after connectivity returns. Queued media older than 24 hours is deleted automatically on startup and by an hourly cleanup task.

## Available commands

| Command            | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| `pnpm dev`         | Start the Vite development server                            |
| `pnpm build`       | Type-check and create the web production build               |
| `pnpm typecheck`   | Run strict TypeScript checks                                 |
| `pnpm preview`     | Preview the web production build locally                     |
| `pnpm lint`        | Run ESLint across the repository                             |
| `pnpm test`        | Run the unit test suite                                      |
| `pnpm test:e2e`    | Run Playwright browser tests                                 |
| `pnpm test:db`     | Run Supabase RLS tests against the local stack               |
| `pnpm check`       | Run formatting, lint, types, tests, and the production build |
| `pnpm tauri:dev`   | Run the desktop app in development mode                      |
| `pnpm tauri:build` | Build platform-specific desktop bundles                      |

## Production builds

### Web / Vercel

```bash
pnpm build
```

Vite outputs the production site to `dist/`. `vercel.json` rewrites requests to `index.html`, while the application uses hash-based routes so shared pages and admin routes remain SPA-safe.

### Desktop / Tauri

```bash
pnpm tauri:build
```

Tauri runs the same frontend build and creates the supported platform bundles configured in `src-tauri/tauri.conf.json`.

## Project structure

```text
src/
├── components/       # Kiosk screens, result/share UI, and admin dashboard
├── constants/        # Shared sticker catalog
├── hooks/            # Supabase, Cloudinary, LUT, and upload-queue logic
├── lib/              # Resource-lifecycle helpers
├── test/             # Shared test setup
├── App.tsx            # Routes and top-level photobooth state machine
└── types.ts           # Shared application types
public/
├── stickers/          # Self-hosted Lottie JSON animations
└── *.png              # Frames, filters, and kiosk artwork
src-tauri/
├── capabilities/      # Desktop capability permissions
├── src/               # Rust entry points
└── tauri.conf.json    # Desktop window, bundle, and CSP configuration
supabase/
├── functions/         # Signed uploads, completion, and retention workers
└── migrations/        # Schema, transactional settings RPC, and RLS
```

## Quality checks

Run the complete quality gate before opening a pull request or producing an event build:

```bash
pnpm check
```

GitHub Actions runs the same quality gate plus a Playwright authentication smoke test. Release builds require the four public `VITE_*` values to be configured as repository secrets.

For hardware validation, also test camera permission, capture timing, memory use across repeated sessions, reconnect behavior, QR delivery, and downloads on the actual kiosk and target mobile devices.

## Privacy note

Photos and videos are personal data. The desktop queue deletes unencrypted local media after 24 hours, and the scheduled retention function applies the same deadline to Cloudinary. Event-specific consent copy, appropriate controller/processor disclosures, and an incident response process are still deployment responsibilities. The consent setting is a UI mechanism, not legal advice.

## Status

This is an actively polished portfolio and event project with strict TypeScript, automated tests, CI, signed uploads, role-based administration, and server-enforced media retention. Deployment-specific credentials, operator accounts, consent language, and retention schedules must be reviewed for each event.
