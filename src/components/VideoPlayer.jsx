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
      try {
        video.muted = Boolean(isMuted);
        const p = video.play();
        playPromiseRef.current = p;
        if (p !== undefined) {
          p.catch(() => {});
        }
      } catch {
        // Ignore
      }
    },
    [getActiveVideo, isMuted]
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

  // Dual-buffered video source switcher — eliminates black screen gap completely
  useEffect(() => {
    if (!useLocalVideo) return;
    const targetSrc = getVideoSrc(ad?.videoUrl);
    if (!targetSrc) return;

    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      const v0 = videoRef0.current;
      if (v0) {
        v0.src = targetSrc;
        v0.muted = Boolean(isMuted);
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

    incomingVideo.muted = Boolean(isMuted);
    incomingVideo.src = targetSrc;
    incomingVideo.load();

    const handleReadyToSwap = () => {
      incomingVideo.muted = Boolean(isMuted);
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

    incomingVideo.addEventListener("canplay", handleReadyToSwap, { once: true });

    return () => {
      incomingVideo.removeEventListener("canplay", handleReadyToSwap);
    };
  }, [ad?.videoUrl, useLocalVideo, getVideoSrc, isMuted, safePause, safePlay]);

  // Sync muted state across both video buffers
  useEffect(() => {
    if (videoRef0.current) videoRef0.current.muted = Boolean(isMuted);
    if (videoRef1.current) videoRef1.current.muted = Boolean(isMuted);
  }, [isMuted]);

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
      mute: () => {
        if (videoRef0.current) videoRef0.current.muted = true;
        if (videoRef1.current) videoRef1.current.muted = true;
      },
      unMute: () => {
        if (videoRef0.current) videoRef0.current.muted = false;
        if (videoRef1.current) videoRef1.current.muted = false;
      },
      setVolume: (val) => {
        try {
          const normVol = Math.max(0, Math.min(1, val / 100));
          if (videoRef0.current) {
            videoRef0.current.volume = normVol;
            videoRef0.current.muted = normVol === 0;
          }
          if (videoRef1.current) {
            videoRef1.current.volume = normVol;
            videoRef1.current.muted = normVol === 0;
          }
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
    return (
      <div className="tv-dual-video-wrapper">
        <video
          ref={videoRef0}
          className={`html5-video-player ${activeBuffer === 0 ? "is-active" : "is-inactive"}`}
          autoPlay
          playsInline
          muted={Boolean(isMuted)}
          preload="auto"
        />
        <video
          ref={videoRef1}
          className={`html5-video-player ${activeBuffer === 1 ? "is-active" : "is-inactive"}`}
          autoPlay
          playsInline
          muted={Boolean(isMuted)}
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
