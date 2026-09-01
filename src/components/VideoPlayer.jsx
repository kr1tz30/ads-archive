import { useCallback, useEffect, useRef, useState } from "react";
import YouTubePlayer from "./YouTubePlayer.jsx";

export const PLAYER_STATES = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
};

export default function VideoPlayer({ ad, onReady, onStateChange, playerRef, isMuted }) {
  const videoRef = useRef(null);
  const playPromiseRef = useRef(null);
  const [localVideoFailed, setLocalVideoFailed] = useState(false);

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

  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const p = video.play();
      playPromiseRef.current = p;
      if (p !== undefined) {
        p.catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, []);

  const safePause = useCallback(() => {
    const video = videoRef.current;
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
  }, []);

  // Update src on the SINGLE permanent video element when ad.videoUrl changes
  useEffect(() => {
    if (!useLocalVideo || !videoRef.current) return;
    const video = videoRef.current;
    const targetSrc = getVideoSrc(ad.videoUrl);

    // 1. Pause current playback before src change
    safePause();

    video.muted = Boolean(isMuted);
    if (!isMuted) video.volume = 1.0;

    // 2. Change src on the SAME video DOM element if changed
    if (targetSrc && !video.src.endsWith(targetSrc)) {
      video.src = targetSrc;
      video.load();
    }

    // 3. Play when canplay or immediately, strictly enforcing isMuted
    const syncMuteAndPlay = () => {
      if (videoRef.current) {
        videoRef.current.muted = Boolean(isMuted);
      }
      safePlay();
    };
    video.addEventListener("canplay", syncMuteAndPlay, { once: true });
    video.addEventListener("loadedmetadata", syncMuteAndPlay, { once: true });

    if (videoRef.current) {
      videoRef.current.muted = Boolean(isMuted);
    }
    safePlay();

    return () => {
      video.removeEventListener("canplay", syncMuteAndPlay);
      video.removeEventListener("loadedmetadata", syncMuteAndPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad?.videoUrl, useLocalVideo, getVideoSrc, safePause, safePlay, isMuted]);
  // NOTE: isMuted sync is also actively maintained on each load & canplay.

  // Sync muted state when isMuted prop changes (no pause/play side-effect)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = Boolean(isMuted);
    }
  }, [isMuted]);

  // Attach playerRef API & state change event listeners
  useEffect(() => {
    if (!useLocalVideo || !videoRef.current) return;
    const video = videoRef.current;

    playerRef.current = {
      playVideo: () => safePlay(),
      pauseVideo: () => safePause(),
      getCurrentTime: () => video.currentTime || 0,
      getDuration: () => video.duration || 0,
      seekTo: (seconds) => {
        try {
          video.currentTime = Math.max(0, seconds);
        } catch {}
      },
      loadVideoById: () => {},
      mute: () => {
        video.muted = true;
      },
      unMute: () => {
        video.muted = false;
      },
      setVolume: (val) => {
        try {
          const normVol = Math.max(0, Math.min(1, val / 100));
          video.volume = normVol;
          video.muted = normVol === 0;
        } catch {
          // Ignore
        }
      },
    };

    const handlePlay = () => onStateChange && onStateChange({ data: PLAYER_STATES.PLAYING });
    const handlePause = () => onStateChange && onStateChange({ data: PLAYER_STATES.PAUSED });
    const handleEnded = () => onStateChange && onStateChange({ data: PLAYER_STATES.ENDED });
    const handleError = () => {
      console.warn("Local video failed to load, falling back to YouTube:", ad?.id);
      setLocalVideoFailed(true);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    onReady && onReady();

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, [useLocalVideo, onReady, onStateChange, playerRef, safePlay, safePause, ad?.id]);

  if (useLocalVideo) {
    return (
      <video
        ref={videoRef}
        className="html5-video-player"
        autoPlay
        playsInline
        muted={Boolean(isMuted)}
      />
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
