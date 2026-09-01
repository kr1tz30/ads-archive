import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer, { PLAYER_STATES } from "./components/VideoPlayer.jsx";
import SkeuoRemote from "./components/SkeuoRemote.jsx";
import { ads as rawAds } from "./data/ads.js";
import "./App.css";

const STATIC_DURATION_MS = 200;

function App() {
  const playableAds = useMemo(
    () => rawAds.filter((a) => a.videoUrl || a.youtubeId),
    [rawAds]
  );
  const ads = playableAds.length ? playableAds : rawAds;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBW, setIsBW] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [isRemoteExpanded, setIsRemoteExpanded] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState("none");
  const playerRef = useRef(null);
  const hasStartedCurrentRef = useRef(false);
  const isFirstMountRef = useRef(true);
  const staticAudioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio("/audio/tv-static.mp3");
    audio.preload = "auto";
    staticAudioRef.current = audio;
    return () => {
      audio.pause();
      staticAudioRef.current = null;
    };
  }, []);

  const currentAd = ads[currentIndex];



  const handleShuffle = useCallback(() => {
    if (ads.length <= 1) return;
    let randomIndex = Math.floor(Math.random() * ads.length);
    while (randomIndex === currentIndex && ads.length > 1) {
      randomIndex = Math.floor(Math.random() * ads.length);
    }
    setCurrentIndex(randomIndex);
  }, [ads.length, currentIndex]);

  const toggleBW = useCallback(() => {
    setIsBW((prev) => !prev);
  }, []);

  // Functional update so rapid clicks each advance from the latest index
  // instead of all reading the same stale currentIndex from their closure.
  const advance = useCallback(
    (delta) => {
      setCurrentIndex((i) => (i + delta + ads.length) % ads.length);
    },
    [ads.length]
  );

  const handleNext = useCallback(() => {
    hasUserInteractedRef.current = true;
    advance(1);
  }, [advance]);

  const handlePrev = useCallback(() => {
    hasUserInteractedRef.current = true;
    advance(-1);
  }, [advance]);

  useEffect(() => {
    hasStartedCurrentRef.current = false;
    const initialPlayer = playerRef.current;
    if (initialPlayer?.pauseVideo) initialPlayer.pauseVideo();

    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      hasStartedCurrentRef.current = true;
      setTransitionPhase("none");
      return;
    }

    setTransitionPhase("static");
    const staticAudio = staticAudioRef.current;
    if (staticAudio) {
      staticAudio.currentTime = 0;
      staticAudio.play().catch(() => {});
    }

    const staticTimer = setTimeout(() => {
      if (staticAudio) {
        staticAudio.pause();
        staticAudio.currentTime = 0;
      }
      const player = playerRef.current;
      if (player && player.playVideo) {
        try {
          player.playVideo();
        } catch {
          // Ignore
        }
      }
      setIsPlaying(true);
      hasStartedCurrentRef.current = true;
      setTransitionPhase("none");
    }, STATIC_DURATION_MS);

    return () => {
      clearTimeout(staticTimer);
      if (staticAudio) {
        staticAudio.pause();
        staticAudio.currentTime = 0;
      }
    };
  }, [currentIndex]);

  const hasUserInteractedRef = useRef(false);

  const [volume, setVolume] = useState(100);

  const triggerToast = useCallback((msg) => {
    setSeekToast(msg);
    if (seekToastTimerRef.current) clearTimeout(seekToastTimerRef.current);
    seekToastTimerRef.current = setTimeout(() => {
      setSeekToast(null);
    }, 1200);
  }, []);

  const changeVolume = useCallback(
    (delta) => {
      hasUserInteractedRef.current = true;
      const player = playerRef.current;
      if (player?.unMute) {
        try {
          player.unMute();
          setIsMuted(false);
        } catch {
          // Ignore
        }
      }
      setVolume((prevVol) => {
        const nextVol = Math.max(0, Math.min(100, prevVol + delta));
        if (player?.setVolume) {
          try {
            player.setVolume(nextVol);
          } catch {
            // Ignore
          }
        }
        triggerToast(`VOL ${nextVol}%`);
        return nextVol;
      });
    },
    [triggerToast]
  );

  const handlePowerToggle = useCallback(() => {
    hasUserInteractedRef.current = true;
    setIsPowerOn((prev) => {
      const nextPower = !prev;
      const player = playerRef.current;
      if (!nextPower) {
        if (player?.pauseVideo) {
          try {
            player.pauseVideo();
          } catch {
            // Ignore
          }
        }
        setIsPlaying(false);
        triggerToast("POWER OFF");
      } else {
        if (player?.playVideo) {
          try {
            player.playVideo();
          } catch {
            // Ignore
          }
        }
        setIsPlaying(true);
        triggerToast("POWER ON");
      }
      return nextPower;
    });
  }, [triggerToast]);

  const digitBufferRef = useRef("");
  const digitTimerRef = useRef(null);

  const handleDigitPress = useCallback(
    (digit) => {
      hasUserInteractedRef.current = true;
      if (digitTimerRef.current) {
        clearTimeout(digitTimerRef.current);
      }
      digitBufferRef.current += String(digit);
      const currentBuf = digitBufferRef.current;
      triggerToast(`CH ${currentBuf.padStart(2, "0")}`);

      digitTimerRef.current = setTimeout(() => {
        const targetNum = parseInt(digitBufferRef.current, 10);
        digitBufferRef.current = "";
        digitTimerRef.current = null;
        if (!isNaN(targetNum) && targetNum > 0) {
          const targetIdx = targetNum - 1;
          if (targetIdx < ads.length) {
            setCurrentIndex(targetIdx);
            triggerToast(`CH ${String(targetNum).padStart(2, "0")}`);
          } else {
            triggerToast(`CH ${targetNum} INVALID`);
          }
        }
      }, 1200);
    },
    [ads.length, triggerToast]
  );

  const unmuteAudio = useCallback(() => {
    hasUserInteractedRef.current = true;
    const player = playerRef.current;
    if (player?.unMute) {
      try {
        player.unMute();
        setIsMuted(false);
      } catch {
        // Unmute blocked
      }
    } else {
      setIsMuted(false);
    }
  }, []);

  const handleMuteToggle = useCallback(() => {
    hasUserInteractedRef.current = true;
    const player = playerRef.current;
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (nextMuted) {
        if (player?.mute) {
          try { player.mute(); } catch { /* ignore */ }
        }
        triggerToast("MUTE");
      } else {
        if (player?.unMute) {
          try { player.unMute(); } catch { /* ignore */ }
        }
        triggerToast("UNMUTE");
      }
      return nextMuted;
    });
  }, [triggerToast]);

  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
      return;
    }
    player.playVideo();
    setIsPlaying(true);
  }, [isPlaying]);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const handleReady = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      hasStartedCurrentRef.current = true;
      if (player.playVideo) {
        try {
          player.playVideo();
        } catch {
          // Autoplay policy handled by browser
        }
      }
      if (isMutedRef.current) {
        if (player.mute) {
          try {
            player.mute();
          } catch {
            // Ignore
          }
        }
      } else if (hasUserInteractedRef.current && player.unMute) {
        try {
          player.unMute();
        } catch {
          // Ignore
        }
      }
      setIsPlaying(true);
    }
  }, []);

  // Ensure audio unmutes on first user touch/click/keypress if browser muted cold autoplay (unless user muted)
  useEffect(() => {
    const handleFirstGesture = () => {
      if (!isMutedRef.current) {
        unmuteAudio();
      }
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
    };

    window.addEventListener("pointerdown", handleFirstGesture);
    window.addEventListener("keydown", handleFirstGesture);

    return () => {
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
    };
  }, [unmuteAudio]);

  // Seek toast & keyboard tap timers
  const [seekToast, setSeekToast] = useState(null);
  const seekToastTimerRef = useRef(null);
  const rightTapTimerRef = useRef(null);
  const leftTapTimerRef = useRef(null);

  const seekBy = useCallback((delta) => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
      const duration = player.getDuration ? player.getDuration() : 0;
      const targetTime = currentTime + delta;
      const newTime =
        duration > 0
          ? Math.min(duration, Math.max(0, targetTime))
          : Math.max(0, targetTime);

      if (player.seekTo) {
        player.seekTo(newTime, true);
      }

      const label = delta > 0 ? `⏩ +${delta}s` : `⏪ ${delta}s`;
      setSeekToast(label);
      if (seekToastTimerRef.current) clearTimeout(seekToastTimerRef.current);
      seekToastTimerRef.current = setTimeout(() => {
        setSeekToast(null);
      }, 1000);
    } catch (err) {
      console.error("Seek error:", err);
    }
  }, []);

  const handleStateChange = useCallback(
    (e) => {
      if (e.data === PLAYER_STATES.PLAYING) setIsPlaying(true);
      if (e.data === PLAYER_STATES.PAUSED) setIsPlaying(false);
      if (e.data === PLAYER_STATES.ENDED) {
        advance(1);
      }
    },
    [advance]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === "ArrowRight" || e.key === "ArrowRight") {
        e.preventDefault();
        if (rightTapTimerRef.current) {
          clearTimeout(rightTapTimerRef.current);
          rightTapTimerRef.current = null;
          handleNext();
        } else {
          rightTapTimerRef.current = setTimeout(() => {
            seekBy(10);
            rightTapTimerRef.current = null;
          }, 250);
        }
      } else if (e.code === "ArrowLeft" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (leftTapTimerRef.current) {
          clearTimeout(leftTapTimerRef.current);
          leftTapTimerRef.current = null;
          handlePrev();
        } else {
          leftTapTimerRef.current = setTimeout(() => {
            seekBy(-10);
            leftTapTimerRef.current = null;
          }, 250);
        }
      } else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(parseInt(e.key, 10));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlePlayPause, handleNext, handlePrev, seekBy, handleDigitPress]);

  // Screen click & touch interaction handler
  const screenLeftTimerRef = useRef(null);
  const screenRightTimerRef = useRef(null);
  const lastTouchTimeRef = useRef(0);

  const handleScreenInteraction = useCallback(
    (e, isTouch = false) => {
      if (isTouch) {
        lastTouchTimeRef.current = Date.now();
      } else if (Date.now() - lastTouchTimeRef.current < 400) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = isTouch
        ? e.changedTouches?.[0]?.clientX ?? e.clientX
        : e.clientX;

      if (clientX === undefined || !rect.width) {
        handlePlayPause();
        return;
      }

      const xRatio = (clientX - rect.left) / rect.width;

      if (xRatio < 0.35) {
        // Left 35%: Single tap = -10s seek, Double tap = Prev channel
        if (screenLeftTimerRef.current) {
          clearTimeout(screenLeftTimerRef.current);
          screenLeftTimerRef.current = null;
          handlePrev();
        } else {
          screenLeftTimerRef.current = setTimeout(() => {
            seekBy(-10);
            screenLeftTimerRef.current = null;
          }, 250);
        }
      } else if (xRatio > 0.65) {
        // Right 35%: Single tap = +10s seek, Double tap = Next channel
        if (screenRightTimerRef.current) {
          clearTimeout(screenRightTimerRef.current);
          screenRightTimerRef.current = null;
          handleNext();
        } else {
          screenRightTimerRef.current = setTimeout(() => {
            seekBy(10);
            screenRightTimerRef.current = null;
          }, 250);
        }
      } else {
        // Center 30%: Toggle Play/Pause
        handlePlayPause();
      }
    },
    [handlePlayPause, handleNext, handlePrev, seekBy]
  );

  return (
    <div className="app">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <main
        className="room"
        onClick={() => {
          if (isRemoteExpanded) setIsRemoteExpanded(false);
        }}
      >
        {/* 90S ROOM SCENE CONTAINER */}
        <div className="room-scene">
          <img
            src={`${import.meta.env.BASE_URL}images/90s_tv_room_bg.jpg`}
            alt="90s Indian Nostalgia TV Room"
            className="room-bg-img"
          />

          {/* SUNBEAM AMBIENT SHIMMER */}
          <div className="animated-sunbeam-overlay" />

          {/* LIVE TV SCREEN EMBEDDED PRECISELY INSIDE CRT TUBE (BPL LOGO FULLY VISIBLE) */}
          <div className="room-tv-screen-wrapper">
            <div className={`tv-screen ${isBW ? "is-bw-mode" : ""} ${!isPowerOn ? "is-off" : ""}`}>
              {!isPowerOn ? (
                <div className="tv-power-off-overlay">
                  <span className="crt-off-glow-dot" />
                </div>
              ) : (
                <>
                  <VideoPlayer
                    ad={currentAd}
                    onReady={handleReady}
                    onStateChange={handleStateChange}
                    playerRef={playerRef}
                    isMuted={isMuted}
                  />

                  {seekToast && <div className="tv-seek-toast">{seekToast}</div>}

                  {/* MUTE INDICATOR ICON ON SCREEN */}
                  {isMuted && (
                    <div className="tv-mute-icon" aria-label="Muted">🔇</div>
                  )}

                  {transitionPhase === "static" && (
                    <div className="tv-static-overlay">
                      <span className="tv-static-roll" />
                    </div>
                  )}

                  {transitionPhase === "none" && (currentAd?.videoUrl || currentAd?.youtubeId) && (
                    <div
                      className={`tv-hit-layer ${!isPlaying ? "is-paused" : ""}`}
                      onClick={(e) => handleScreenInteraction(e, false)}
                      onTouchEnd={(e) => handleScreenInteraction(e, true)}
                      role="button"
                      tabIndex={0}
                      aria-label={isPlaying ? "Pause TV (or tap left/right to seek/switch)" : "Play TV"}
                    >
                      <div className="tv-hit-zone tv-hit-zone--left" />
                      <div className="tv-hit-zone tv-hit-zone--center">
                        {!isPlaying && (
                          <div className="tv-play-pause-btn" aria-label="Resume Video">
                            <span className="tv-play-pause-icon">▶</span>
                          </div>
                        )}
                      </div>
                      <div className="tv-hit-zone tv-hit-zone--right" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* SKEUOMORPHIC TV REMOTE CONTROL TOUCHING BOTTOM CENTER */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          className={`mini-remote-wrapper ${isRemoteExpanded ? "is-expanded" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (window.matchMedia("(max-width: 991px), (pointer: coarse)").matches) {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickY = e.clientY - rect.top;
              if (clickY < 75) {
                setIsRemoteExpanded((prev) => !prev);
              }
            }
          }}
        >
          {/* Mobile pull tab handle */}
          <button
            type="button"
            className="remote-pull-handle"
            onClick={(e) => {
              e.stopPropagation();
              setIsRemoteExpanded((prev) => !prev);
            }}
            aria-label={isRemoteExpanded ? "Close Remote" : "Open Remote"}
          >
            <span className="remote-pull-bar" />
          </button>

          <SkeuoRemote
            isPowerOn={isPowerOn}
            isMuted={isMuted}
            isPlaying={isPlaying}
            onPower={handlePowerToggle}
            onMute={handleMuteToggle}
            onVolUp={() => changeVolume(10)}
            onVolDown={() => changeVolume(-10)}
            onChNext={handleNext}
            onChPrev={handlePrev}
            onOk={handlePlayPause}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
