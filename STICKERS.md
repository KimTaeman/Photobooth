# Local Lottie Stickers

Tatt n' Snap self-hosts its Lottie JSON animations with the application. No sticker files are fetched from LottieFiles or another third-party CDN at runtime.

## How stickers are organized

```text
public/
└── stickers/
    ├── cat_cry.json
    ├── cat_laugh.json
    ├── cat_love.json
    ├── cat_sleep.json
    ├── dog_amaze.json
    ├── dog_love.json
    └── fire.json

src/
└── constants/
    └── sticker.tsx       # Shared sticker catalog
```

`src/constants/sticker.tsx` is the single source of truth for the catalog. Both the result screen and the sticker test page import it, so their lists stay synchronized.

```ts
export const STICKERS: { label: string; src: string }[] = [
  { label: '😹 Laugh', src: '/stickers/cat_laugh.json' },
  { label: '🔥 Fire', src: '/stickers/fire.json' },
];
```

Paths beginning with `/stickers/` resolve to files under `public/stickers/` in both Vite development and production builds.

## Add or replace a sticker

1. Obtain a Lottie JSON animation with a license that permits its intended use.
2. Give the file a lowercase, descriptive name such as `party_confetti.json`.
3. Place the file in `public/stickers/`.
4. Add one entry to `src/constants/sticker.tsx`:

   ```ts
   { label: '🎉 Confetti', src: '/stickers/party_confetti.json' },
   ```

5. Start the app with `pnpm dev` and open `/#/sticker-test`.
6. Confirm that the animation loads, loops smoothly, and remains responsive when several instances are placed.
7. Run `pnpm lint` and `pnpm build` before committing.

Do not add separate catalogs to `ResultScreen.tsx` or `StickerTestPage.tsx`; update the shared catalog instead.

## Offline behavior

Local sticker files are bundled with the web build and packaged Tauri application. This avoids runtime CDN availability issues and allows stickers to render without an internet connection after the application assets are available locally.

This does not make the entire photobooth offline-only. Supabase configuration, Cloudinary uploads, and QR-based remote downloads still require connectivity. The Tauri build queues failed media uploads in its app cache and retries them when the connection returns.

## Asset guidelines

- Prefer small, vector-only Lottie JSON files with limited layers and effects.
- Avoid animations containing embedded base64 images; they increase parse time and memory use.
- Remove unused layers, hidden assets, expressions, and excessive keyframes before shipping.
- Keep filenames stable after release so cached builds and catalog entries do not break.
- Record each animation's source and license when adding third-party artwork.
- Treat Lottie JSON as untrusted input: review externally sourced files before bundling them.

Because these files live under `public/`, Vite copies them as-is and does not fingerprint them. When replacing an existing animation, rename the file or add an explicit versioning strategy if clients may have cached the previous JSON.
