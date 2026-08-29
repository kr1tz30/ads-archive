# Local video files not included

This folder is used for local-only playback of the actual ad clips
(`ads.js` entries with a `videoUrl`), but the `.mp4` files themselves are
**not committed to this repo** — they're downloaded copies of copyrighted
TV commercials, and publishing them would be a copyright/DMCA risk.

The deployed site doesn't need them: `VideoPlayer.jsx` falls back to that
ad's YouTube embed (`youtubeId`) automatically whenever a local file is
missing, which is exactly what happens here on GitHub Pages.

If you're running this locally and want the local-file experience, drop
matching `.mp4` files into this folder yourself — filenames are referenced
in `src/data/ads.js`.
