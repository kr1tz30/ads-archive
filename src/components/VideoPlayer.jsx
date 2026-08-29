import { useEffect, useRef, useState } from "react";
import YouTubePlayer from "./YouTubePlayer.jsx";

export const PLAYER_STATES = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
};

export default function VideoPlayer({ ad, onReady, onStateChange, playerRef }) {
  const videoRef = useRef(null);
  // Local mp4s aren't published (copyright — see public/videos/README).
  // If one 404s, fall back to the YouTube embed for that ad instead of
  // showing a broken player.
  const [localVideoFailed, setLocalVideoFailed] = useState(false);

  useEffect(() => {
    setLocalVideoFailed(false);
  }, [ad?.videoUrl]);

  const useLocalVideo = ad?.videoUrl && !localVideoFailed;

  // If HTML5 MP4 video URL is available, use native HTML5 video player
  useEffect(() => {
    if (useLocalVideo && videoRef.current) {
      const video = videoRef.current;

      playerRef.current = {
        playVideo: () => video.play(),
        pauseVideo: () => video.pause(),
        getCurrentTime: () => video.currentTime || 0,
        seekTo: (seconds) => {
          video.currentTime = Math.max(0, seconds);
        },
        loadVideoById: () => {},
        mute: () => {
          video.muted = true;
        },
        unMute: () => {
          video.muted = false;
        },
      };

      const handlePlay = () => onStateChange && onStateChange({ data: PLAYER_STATES.PLAYING });
      const handlePause = () => onStateChange && onStateChange({ data: PLAYER_STATES.PAUSED });
      const handleEnded = () => onStateChange && onStateChange({ data: PLAYER_STATES.ENDED });

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("ended", handleEnded);

      onReady && onReady();

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("ended", handleEnded);
      };
    }
  }, [useLocalVideo, onReady, onStateChange, playerRef]);

  if (useLocalVideo) {
    return (
      <video
        key={ad.videoUrl}
        ref={videoRef}
        src={ad.videoUrl}
        className="html5-video-player"
        playsInline
        onError={() => setLocalVideoFailed(true)}
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
      />
    );
  }

  return <div className="tv-empty">No video available for this ad.</div>;
}
