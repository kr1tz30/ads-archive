import { useEffect, useRef } from "react";

let apiPromise = null;

function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export default function YouTubePlayer({ videoId, onReady, onStateChange, playerRef }) {
  const wrapperRef = useRef(null);
  const internalPlayer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    // YT.Player replaces its target node with an iframe, which React never
    // sees — so the target must be a plain DOM node React doesn't track,
    // not a ref'd JSX child. Otherwise StrictMode's mount/cleanup/mount
    // double-invoke races with YouTube's own DOM swap and React ends up
    // calling removeChild on a node that's already gone.
    const target = document.createElement("div");
    wrapperRef.current.appendChild(target);

    loadYouTubeAPI().then((YT) => {
      if (cancelled) return;
      internalPlayer.current = new YT.Player(target, {
        videoId: videoId || undefined,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
        },
        events: {
          onReady: (e) => {
            playerRef.current = internalPlayer.current;
            // Some videos force captions on regardless of cc_load_policy;
            // explicitly unload the captions module as a second attempt.
            if (e.target.unloadModule) {
              e.target.unloadModule("captions");
            }
            onReady && onReady(e);
          },
          onStateChange: (e) => onStateChange && onStateChange(e),
        },
      });
    });

    return () => {
      cancelled = true;
      if (internalPlayer.current && internalPlayer.current.destroy) {
        internalPlayer.current.destroy();
      }
      internalPlayer.current = null;
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={wrapperRef} className="yt-player" />;
}
