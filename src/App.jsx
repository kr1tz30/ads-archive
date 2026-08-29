import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer, { PLAYER_STATES } from "./components/VideoPlayer.jsx";
import { ads as rawAds } from "./data/ads.js";
import "./App.css";

const STATIC_DURATION_MS = 1500;
// YouTube shows a transient title/share/pause "intro card" for a couple of
// seconds at the very start of any freshly loaded video, even with
// controls:0 — this can't be suppressed via player params, so we keep the
// screen covered a bit longer (muted) after loading before revealing it.
const SETTLE_DURATION_MS = 1400;

function App() {
  const playableAds = useMemo(
    () => rawAds.filter((a) => a.videoUrl || a.youtubeId),
    [rawAds]
  );
  const ads = playableAds.length ? playableAds : rawAds;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBW, setIsBW] = useState(false);
  // 'none' | 'static' | 'settling' — 'settling' keeps the screen covered
  // (muted) a bit longer after loading so YouTube's intro card never shows.
  const [transitionPhase, setTransitionPhase] = useState("none");
  const playerRef = useRef(null);
  const isFirstRender = useRef(true);
  const hasStartedCurrentRef = useRef(false);
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

  const handleNext = useCallback(() => advance(1), [advance]);
  const handlePrev = useCallback(() => advance(-1), [advance]);

  useEffect(() => {
    hasStartedCurrentRef.current = false;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const ad = ads[currentIndex];
    const player = playerRef.current;
    // Cut audio immediately so the outgoing ad doesn't play under the static.
    if (player?.pauseVideo) player.pauseVideo();
    if (player?.mute) player.mute();
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
      if (player) {
        if (ad?.youtubeId && !ad?.videoUrl && player.loadVideoById) {
          player.loadVideoById(ad.youtubeId);
          if (player.unloadModule) player.unloadModule("captions");
        }
        if (player.playVideo) player.playVideo();
      }
      hasStartedCurrentRef.current = true;
      setTransitionPhase("settling");
    }, STATIC_DURATION_MS);

    return () => {
      clearTimeout(staticTimer);
      if (staticAudio) {
        staticAudio.pause();
        staticAudio.currentTime = 0;
      }
    };
  }, [currentIndex, ads]);

  useEffect(() => {
    if (transitionPhase !== "settling") return;
    const player = playerRef.current;
    const settleTimer = setTimeout(() => {
      if (player?.unMute) player.unMute();
      setIsPlaying(true);
      setTransitionPhase("none");
    }, SETTLE_DURATION_MS);
    return () => clearTimeout(settleTimer);
  }, [transitionPhase]);

  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
      return;
    }
    if (!hasStartedCurrentRef.current) {
      // First play of this ad — mask the intro card the same way as a
      // channel switch, just without the static (it wasn't a switch).
      hasStartedCurrentRef.current = true;
      if (player.mute) player.mute();
      player.playVideo();
      setTransitionPhase("settling");
      return;
    }
    player.playVideo();
  }, [isPlaying]);

  const handleReady = useCallback(() => {
    // Player mounted; playback starts on user interaction.
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Purani Yaadein TV</h1>
        <p>A channel for old Indian ads that never left our heads.</p>
      </header>

      <main className="room">
        <div className="wall">
          <div className="frame-row">
            <div className="frame frame--sm">
              <div className="frame-art frame-art--1" />
            </div>
            <div className="frame frame--lg">
              <div className="frame-art frame-art--2" />
            </div>
            <div className="frame frame--sm">
              <div className="frame-art frame-art--3" />
            </div>
          </div>

          <div className="tv-console">
            <div className="tv-antenna">
              <span className="tv-antenna-rod tv-antenna-rod--left" />
              <span className="tv-antenna-rod tv-antenna-rod--right" />
            </div>

            <div className="tv-top">
              <div className="tv-screen-bezel">
                <div className={`tv-screen ${isBW ? "is-bw-mode" : ""}`}>
                  <VideoPlayer
                    ad={currentAd}
                    onReady={handleReady}
                    onStateChange={handleStateChange}
                    playerRef={playerRef}
                  />

                  {transitionPhase === "static" && (
                    <div className="tv-static-overlay">
                      <span className="tv-static-roll" />
                    </div>
                  )}

                  {transitionPhase === "settling" && (
                    <div className="tv-settle-cover" />
                  )}

                  {transitionPhase === "none" && (currentAd?.videoUrl || currentAd?.youtubeId) && (
                    <button
                      type="button"
                      className="tv-hit-layer"
                      onClick={handlePlayPause}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {!isPlaying && (
                        <span className="tv-pause-cover-icon">▶</span>
                      )}
                    </button>
                  )}
                </div>

                {/* HORIZONTAL HARDWARE CONTROL BAR DIRECTLY BELOW SCREEN */}
                <div className="tv-bottom-control-bar">
                  <div className="tv-channel-display">
                    <span className="tv-channel-label">CH</span>
                    <span className="tv-channel-num">
                      {String(currentIndex + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="tv-bottom-btn-group">
                    <button
                      type="button"
                      className={`tv-bar-btn tv-power-btn ${isPlaying ? "is-playing" : ""}`}
                      onClick={handlePlayPause}
                      title={isPlaying ? "Pause TV" : "Play TV"}
                    >
                      <span className="tv-power-light" />
                      <span>{isPlaying ? "PAUSE ⏸" : "PLAY ▶"}</span>
                    </button>

                    <button
                      type="button"
                      className="tv-bar-btn"
                      onClick={handlePrev}
                      title="Previous Channel"
                    >
                      ⏮ CH -
                    </button>

                    <button
                      type="button"
                      className="tv-bar-btn"
                      onClick={handleNext}
                      title="Next Channel"
                    >
                      CH + ⏭
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CHANNEL THUMBNAIL IMAGES GALLEY BELOW THE SCREEN */}
            <div className="tv-channel-strip">
              <div className="tv-strip-header">
                <span>SELECT CHANNEL / AD ARCHIVE</span>
              </div>
              <div className="tv-thumbnails-row">
                {ads.map((ad, idx) => {
                  const thumbUrl = ad.youtubeId
                    ? `https://i.ytimg.com/vi/${ad.youtubeId}/mqdefault.jpg`
                    : null;
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={ad.id || idx}
                      type="button"
                      className={`tv-thumb-card ${isActive ? "is-active" : ""}`}
                      onClick={() => {
                        if (idx !== currentIndex) {
                          setCurrentIndex(idx);
                        }
                      }}
                      title={ad.title}
                    >
                      <div className="tv-thumb-img-wrapper">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={ad.title}
                            className="tv-thumb-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="tv-thumb-placeholder">CH {idx + 1}</div>
                        )}
                        <span className="tv-thumb-ch-badge">
                          CH {String(idx + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="tv-thumb-title">{ad.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="tv-cabinet-base">
              <button
                type="button"
                className="tv-drawer-btn"
                onClick={handleShuffle}
                title="Surprise Channel / Jump to Random Ad"
              >
                <span className="tv-drawer-brass-handle" />
                <span className="tv-drawer-label">🔀 SURPRISE CHANNEL</span>
              </button>

              <button
                type="button"
                className={`tv-drawer-btn ${isBW ? "is-active" : ""}`}
                onClick={toggleBW}
                title="Toggle Vintage Black & White TV Mode"
              >
                <span className="tv-drawer-brass-handle" />
                <span className="tv-drawer-label">
                  {isBW ? "📺 COLOR MODE" : "📼 1950s B&W MODE"}
                </span>
              </button>
            </div>
            <div className="tv-legs">
              <span className="tv-leg tv-leg--left" />
              <span className="tv-leg tv-leg--right" />
            </div>
          </div>
        </div>

        <div className="rug" />
      </main>
    </div>
  );
}

export default App;
