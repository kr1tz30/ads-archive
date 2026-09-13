import { useCallback, useEffect, useRef, useState } from "react";
import YouTubePlayer from "./YouTubePlayer.jsx";

export const PLAYER_STATES = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
};

export default function VideoPlayer({ ad, nextAd, onReady, onStateChange, playerRef, isMuted }) {
  const videoRef0 = useRef(null);
  const videoRef1 = useRef(null);
  const activeBufferRef = useRef(0);
  const [activeBuffer, setActiveBuffer] = useState(0);
  const [localVideoFailed, setLocalVideoFailed] = useState(false);
  const playPromiseRef = useRef(null);
  const isFirstMountRef = useRef(true);
  // Browsers always allow autoplay muted, but require a real user
  // gesture (anywhere on the page) before allowing unmuted playback.
  // Rather than fight that with imperative timing tricks against
  // React's own re-renders (a `.muted = true` DOM mutation gets
  // silently reverted the moment ANY re-render happens, since
  // `muted={Boolean(isMuted)}` below is a React-controlled prop that
  // gets reconciled back to the JSX value every render — including the
  // `setIsPlaying(true)` re-render that fires moments after mount),
  // this is modeled as actual React state so the JSX declaration is
  // always the single source of truth for both video elements. Starts
  // true so the very first video is guaranteed-autoplayable; flips to
  // false once the user has genuinely interacted (see the exposed
  // `mute`/`unMute` methods below, called from App.jsx's first-gesture
  // listener and the mute button).
  const [awaitingFirstInteraction, setAwaitingFirstInteraction] = useState(true);

  useEffect(() => {
    setLocalVideoFailed(false);
  }, [ad?.videoUrl]);

  const useLocalVideo = Boolean(ad?.videoUrl) && !localVideoFailed;

  const getVideoSrc = useCallback((url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = import.meta.env.BASE_URL || "/";
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    return baseUrl.endsWith("/") ? `${baseUrl}${cleanUrl}` : `${baseUrl}/${cleanUrl}`;
  }, []);

  const getActiveVideo = useCallback(() => {
    return activeBufferRef.current === 0 ? videoRef0.current : videoRef1.current;
  }, []);

  const safePlay = useCallback(
    (targetVideo) => {
      const video = targetVideo || getActiveVideo();
      if (!video) return;
      // Muted state is fully owned by the `muted` JSX prop on both
      // <video> elements (see awaitingFirstInteraction above) — never
      // set `.muted` imperatively here or anywhere else in this file.
      try {
        const p = video.play();
        playPromiseRef.current = p;
        if (p !== undefined) {
          p.catch(() => {});
        }
      } catch {
        // Ignore
      }
    },
    [getActiveVideo]
  );

  const safePause = useCallback(
    (targetVideo) => {
      const video = targetVideo || getActiveVideo();
      if (!video) return;
      const p = playPromiseRef.current;
      if (p !== undefined && p !== null) {
        p.then(() => {
          try {
            video.pause();
          } catch {}
        }).catch(() => {});
      } else {
        try {
          video.pause();
        } catch {}
      }
    },
    [getActiveVideo]
  );

  // Dual-buffered video source switcher — eliminates black screen gap completely.
  // isMuted is intentionally NOT a dependency here: this effect's job is to
  // load a fresh buffer and swap to it when the AD changes. It used to also
  // include isMuted, so toggling mute re-ran this whole "load a new buffer
  // and swap" flow and restarted the video from 0 for no reason — the mute
  // state itself is applied purely via the `muted` prop on both <video>
  // elements (see awaitingFirstInteraction above), not touched here.
  useEffect(() => {
    if (!useLocalVideo) return;
    const targetSrc = getVideoSrc(ad?.videoUrl);
    if (!targetSrc) return;

    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      const v0 = videoRef0.current;
      if (v0) {
        v0.src = targetSrc;
        v0.load();
        safePlay(v0);
      }
      return;
    }

    const currentActive = activeBufferRef.current;
    const incomingBuffer = currentActive === 0 ? 1 : 0;
    const incomingVideo = incomingBuffer === 0 ? videoRef0.current : videoRef1.current;
    const outgoingVideo = currentActive === 0 ? videoRef0.current : videoRef1.current;

    if (!incomingVideo) return;

    incomingVideo.src = targetSrc;
    incomingVideo.load();

    let swapped = false;
    const doSwap = () => {
      if (swapped) return;
      swapped = true;
      const playPromise = incomingVideo.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            activeBufferRef.current = incomingBuffer;
            setActiveBuffer(incomingBuffer);
            if (outgoingVideo) {
              safePause(outgoingVideo);
              outgoingVideo.currentTime = 0;
            }
          })
          .catch(() => {
            activeBufferRef.current = incomingBuffer;
            setActiveBuffer(incomingBuffer);
            if (outgoingVideo) safePause(outgoingVideo);
          });
      } else {
        activeBufferRef.current = incomingBuffer;
        setActiveBuffer(incomingBuffer);
        if (outgoingVideo) safePause(outgoingVideo);
      }
    };

    // Swap as soon as first frame is ready
    incomingVideo.addEventListener("loadeddata", doSwap, { once: true });
    incomingVideo.addEventListener("canplay", doSwap, { once: true });
    const fallbackTimer = setTimeout(doSwap, 180);

    return () => {
      clearTimeout(fallbackTimer);
      incomingVideo.removeEventListener("loadeddata", doSwap);
      incomingVideo.removeEventListener("canplay", doSwap);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad?.videoUrl, useLocalVideo, getVideoSrc, safePause, safePlay]);

  // Expose player API to parent
  useEffect(() => {
    if (!useLocalVideo) return;

    playerRef.current = {
      playVideo: () => safePlay(),
      pauseVideo: () => safePause(),
      getCurrentTime: () => getActiveVideo()?.currentTime || 0,
      getDuration: () => getActiveVideo()?.duration || 0,
      seekTo: (seconds) => {
        const v = getActiveVideo();
        if (v) {
          try {
            v.currentTime = Math.max(0, seconds);
          } catch {}
        }
      },
      loadVideoById: () => {},
      // mute/unMute only ever flip awaitingFirstInteraction off — the
      // actual `.muted` DOM property is fully owned by the `muted` JSX
      // prop below, driven by (awaitingFirstInteraction || isMuted).
      // Any real call here (explicit mute button, or the page's first-
      // gesture listener) means the user has genuinely interacted, so
      // it's always safe to hand control over to the isMuted prop from
      // this point on.
      mute: () => setAwaitingFirstInteraction(false),
      unMute: () => setAwaitingFirstInteraction(false),
      setVolume: (val) => {
        try {
          const normVol = Math.max(0, Math.min(1, val / 100));
          if (videoRef0.current) videoRef0.current.volume = normVol;
          if (videoRef1.current) videoRef1.current.volume = normVol;
          if (normVol > 0) setAwaitingFirstInteraction(false);
        } catch {
          // Ignore
        }
      },
    };
  }, [useLocalVideo, getActiveVideo, safePlay, safePause, playerRef]);

  // Attach playback state listeners
  useEffect(() => {
    if (!useLocalVideo) return;
    const v0 = videoRef0.current;
    const v1 = videoRef1.current;

    const createHandler = (bufferIdx, eventName) => () => {
      if (activeBufferRef.current === bufferIdx) {
        if (eventName === "play") onStateChange && onStateChange({ data: PLAYER_STATES.PLAYING });
        if (eventName === "pause") onStateChange && onStateChange({ data: PLAYER_STATES.PAUSED });
        if (eventName === "ended") onStateChange && onStateChange({ data: PLAYER_STATES.ENDED });
      }
    };

    const handlePlay0 = createHandler(0, "play");
    const handlePause0 = createHandler(0, "pause");
    const handleEnded0 = createHandler(0, "ended");

    const handlePlay1 = createHandler(1, "play");
    const handlePause1 = createHandler(1, "pause");
    const handleEnded1 = createHandler(1, "ended");

    const handleError = () => {
      console.warn("Local video failed to load, falling back to YouTube:", ad?.id);
      setLocalVideoFailed(true);
    };

    if (v0) {
      v0.addEventListener("play", handlePlay0);
      v0.addEventListener("pause", handlePause0);
      v0.addEventListener("ended", handleEnded0);
      v0.addEventListener("error", handleError);
    }
    if (v1) {
      v1.addEventListener("play", handlePlay1);
      v1.addEventListener("pause", handlePause1);
      v1.addEventListener("ended", handleEnded1);
      v1.addEventListener("error", handleError);
    }

    onReady && onReady();

    return () => {
      if (v0) {
        v0.removeEventListener("play", handlePlay0);
        v0.removeEventListener("pause", handlePause0);
        v0.removeEventListener("ended", handleEnded0);
        v0.removeEventListener("error", handleError);
      }
      if (v1) {
        v1.removeEventListener("play", handlePlay1);
        v1.removeEventListener("pause", handlePause1);
        v1.removeEventListener("ended", handleEnded1);
        v1.removeEventListener("error", handleError);
      }
    };
  }, [useLocalVideo, onReady, onStateChange, ad?.id]);

  if (useLocalVideo) {
    const muted = awaitingFirstInteraction || Boolean(isMuted);
    return (
      <div className="tv-dual-video-wrapper">
        <video
          ref={videoRef0}
          className={`html5-video-player ${activeBuffer === 0 ? "is-active" : "is-inactive"}`}
          autoPlay
          playsInline
          muted={muted}
          preload="auto"
        />
        <video
          ref={videoRef1}
          className={`html5-video-player ${activeBuffer === 1 ? "is-active" : "is-inactive"}`}
          autoPlay
          playsInline
          muted={muted}
          preload="auto"
        />
        {nextAd?.videoUrl && (
          <link rel="prefetch" href={getVideoSrc(nextAd.videoUrl)} as="video" />
        )}
      </div>
    );
  }

  if (ad?.youtubeId) {
    return (
      <YouTubePlayer
        videoId={ad.youtubeId}
        onReady={onReady}
        onStateChange={onStateChange}
        playerRef={playerRef}
        isMuted={isMuted}
      />
    );
  }

  return <div className="tv-empty">No video available for this ad.</div>;
}
