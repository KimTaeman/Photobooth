# Stickers Guide

Stickers on the result screen are Lottie JSON animations.

## Current setup

Stickers are loaded from the LottieFiles CDN at runtime. The catalog is defined at the top of:

- `src/components/ResultScreen.tsx` — production (result screen)
- `src/components/StickerTestPage.tsx` — test page (`/#/sticker-test`)

```ts
const STICKER_CATALOG = [
  { label: '🎉 Confetti', src: 'https://assets6.lottiefiles.com/...' },
  ...
];
```

> ⚠️ CDN URLs can go down. See below to self-host instead.

---

## How to self-host stickers (recommended for events)

### 1. Download Lottie JSON files

Go to [lottiefiles.com](https://lottiefiles.com) → find an animation → click **Download** → choose **Lottie JSON**.

Free animations: https://lottiefiles.com/featured

### 2. Put the files in `/public/stickers/`

```
public/
  stickers/
    confetti.json
    stars.json
    heart.json
    fire.json
    rainbow.json
    sparkle.json
    wave.json
    party.json
```

### 3. Update the catalog src paths

In `src/components/ResultScreen.tsx`, change each `src` to a local path:

```ts
const STICKER_CATALOG = [
  { label: '🎉 Confetti', src: '/stickers/confetti.json' },
  { label: '⭐ Stars',    src: '/stickers/stars.json' },
  { label: '❤️ Heart',   src: '/stickers/heart.json' },
  { label: '🔥 Fire',     src: '/stickers/fire.json' },
  { label: '🌈 Rainbow',  src: '/stickers/rainbow.json' },
  { label: '✨ Sparkle',  src: '/stickers/sparkle.json' },
  { label: '👋 Wave',     src: '/stickers/wave.json' },
  { label: '🎊 Party',    src: '/stickers/party.json' },
];
```

Do the same in `src/components/StickerTestPage.tsx` to keep the test page in sync.

That's it — no code changes needed beyond updating the `src` paths.
