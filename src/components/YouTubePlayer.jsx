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

export default function YouTubePlayer({ videoId, onReady, onStateChange, playerRef, isMuted }) {
  const wrapperRef = useRef(null);
  const internalPlayer = useRef(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (internalPlayer.current) {
      if (isMuted) {
        try { internalPlayer.current.mute(); } catch {}
      } else {
        try { internalPlayer.current.unMute(); } catch {}
      }
    }
  }, [isMuted]);

  useEffect(() => {
    let cancelled = false;
    const container = wrapperRef.current;
    if (!container) return;

    // Pre-create iframe with explicit allow="autoplay; encrypted-media" feature policy
    const iframe = document.createElement("iframe");
    const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
    iframe.src = `https://www.youtube.com/embed/${videoId || ""}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&rel=0&playsinline=1&enablejsapi=1&cc_load_policy=0&iv_load_policy=3&disablekb=1&modestbranding=1&fs=0${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`;
    iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
    iframe.setAttribute("allowfullscreen", "1");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    container.innerHTML = "";
    container.appendChild(iframe);

    loadYouTubeAPI().then((YT) => {
      if (cancelled) return;
      internalPlayer.current = new YT.Player(iframe, {
        events: {
          onReady: (e) => {
            playerRef.current = e.target;
            try {
              if (isMutedRef.current) {
                e.target.mute();
              } else {
                e.target.unMute();
                e.target.setVolume(100);
              }
              e.target.playVideo();
            } catch {
              // Autoplay error fallback
            }
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
        try {
          internalPlayer.current.destroy();
        } catch {
          // Ignore
        }
      }
      internalPlayer.current = null;
      playerRef.current = null;
      if (container) container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={wrapperRef} className="yt-player" />;
}
