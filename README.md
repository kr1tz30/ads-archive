# Purani Yaadein TV

A nostalgia site for classic Indian TV commercials — Fevicol, Cadbury, Vodafone
ZooZoos, Vicco Turmeric, and more — played inside a retro CRT console, complete
with channel-change static and a black & white mode.

## Running locally

```bash
npm install
npm run dev
```

## How playback works

Ads embed via the [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)
(`src/components/YouTubePlayer.jsx`), which is what actually plays on the
deployed site. `VideoPlayer.jsx` can optionally play a local `.mp4` instead
(see `public/videos/README.md` for why those files aren't in this repo) and
falls back to the YouTube embed automatically if one isn't found.

## Deployment

Pushing to `main` builds the app and deploys it to GitHub Pages via
`.github/workflows/deploy.yml`.
