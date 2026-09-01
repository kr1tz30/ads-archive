import "./SkeuoRemote.css";

export default function SkeuoRemote({
  isPowerOn,
  isMuted,
  isPlaying,
  onPower,
  onMute,
  onVolUp,
  onVolDown,
  onChNext,
  onChPrev,
  onOk,
}) {
  return (
    <div className="sr-body" aria-label="TV Remote Control">
      {/* ── TOP SECTION: labels + indicator buttons ── */}
      <div className="sr-top-bar">
        <div className="sr-top-col">
          <span className="sr-label">POWER</span>
          <button
            type="button"
            className={`sr-pill-btn sr-power-btn${isPowerOn ? " sr-power-on" : ""}`}
            onClick={onPower}
            title={isPowerOn ? "Turn Off" : "Turn On"}
            aria-label="Power"
          >
            <span className="sr-power-led" />
          </button>
        </div>
        <div className="sr-top-col sr-top-col--right">
          <span className="sr-label">MUTE</span>
          <button
            type="button"
            className={`sr-pill-btn sr-mute-btn${isMuted ? " sr-muted" : ""}`}
            onClick={onMute}
            title={isMuted ? "Unmute" : "Mute"}
            aria-label="Mute"
          >
            <span className="sr-mute-dot" />
          </button>
        </div>
      </div>

      {/* ── D‑PAD RING ── */}
      <div className="sr-dpad-ring">
        {/* VOL+ top */}
        <button
          type="button"
          className="sr-arc sr-arc--top"
          onClick={onVolUp}
          title="Volume Up"
          aria-label="VOL+"
        />

        {/* VOL- bottom */}
        <button
          type="button"
          className="sr-arc sr-arc--bottom"
          onClick={onVolDown}
          title="Volume Down"
          aria-label="VOL-"
        />

        {/* CH- left */}
        <button
          type="button"
          className="sr-arc sr-arc--left"
          onClick={onChPrev}
          title="Previous Channel"
          aria-label="CH-"
        />

        {/* CH+ right */}
        <button
          type="button"
          className="sr-arc sr-arc--right"
          onClick={onChNext}
          title="Next Channel"
          aria-label="CH+"
        />

        {/* Absolute positioned labels over the buttons for perfect concentric balancing */}
        <div className="sr-dpad-label sr-dpad-label--top">
          <span className="sr-arc-arrow sr-arc-arrow--up">▲</span>
          <span className="sr-arc-text">VOL+</span>
        </div>

        <div className="sr-dpad-label sr-dpad-label--bottom">
          <span className="sr-arc-arrow sr-arc-arrow--down">▼</span>
          <span className="sr-arc-text">VOL-</span>
        </div>

        <div className="sr-dpad-label sr-dpad-label--left">
          <span className="sr-arc-arrow">◀</span>
          <span className="sr-arc-text sr-arc-text--left">CH-</span>
        </div>

        <div className="sr-dpad-label sr-dpad-label--right">
          <span className="sr-arc-text sr-arc-text--right">CH+</span>
          <span className="sr-arc-arrow">▶</span>
        </div>

        {/* Center OK */}
        <button
          type="button"
          className="sr-ok-btn"
          onClick={onOk}
          title={isPlaying ? "Pause" : "Play"}
          aria-label="OK"
        >
          <span className="sr-ok-stop-icon">■</span>
          <span className="sr-ok-label">OK</span>
        </button>
      </div>

      {/* ── LOWER BODY ── */}
      <div className="sr-lower-body">
        <div className="sr-lower-sheen" />
      </div>
    </div>
  );
}
