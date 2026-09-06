# Local ad clips

The `.mp4` files in this folder are committed to the repo and served
directly by the deployed site (`VideoPlayer.jsx` prefers a local
`videoUrl` over the YouTube embed for every ad — see `src/data/ads.js`).

**Note on copyright:** these are downloaded copies of the actual TV
commercials, not original content — publishing them here was a
deliberate, informed decision, not an oversight. If a file ever goes
missing (e.g. it's still gitignored, or was removed), `VideoPlayer.jsx`
falls back to that ad's YouTube embed (`youtubeId`) automatically.
