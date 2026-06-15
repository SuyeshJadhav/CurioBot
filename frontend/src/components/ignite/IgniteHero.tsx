interface IgniteHeroProps {
  igniteQuest: () => void;
}

export function IgniteHero({ igniteQuest }: IgniteHeroProps) {
  return (
    <div className="hero-stage">
      <div className="noise-overlay" />

      <div className="hero-title-wrap">
        <h2 className="hero-title">CurioBot</h2>
        <p className="hero-sub">
          Pick a topic on the left, or let us choose one for you.
        </p>
      </div>

      <button
        className="ignite-btn"
        aria-label="Start"
        onClick={() => igniteQuest()}
      >
        <div className="ignite-inner">
          <span
            className="material-symbols-outlined ignite-icon"
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '3rem' }}
          >
            play_arrow
          </span>
          <span className="ignite-label">Start</span>
        </div>
      </button>

      <div className="ignite-hint">
        Click to begin
      </div>
    </div>
  );
}
