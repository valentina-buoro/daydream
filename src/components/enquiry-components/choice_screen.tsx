const canImages = {
  blackberry: '/public/images/blackberry.webp',
  cucumber: '/public/images/cucumber.webp',
  peach: '/public/images/daydream/peach.webp',
  paloma: '/public/images/daydream/paloma.webp',
}

function Can({ src, className }: { src: string; className: string }) {
  return <img src={src} alt="" aria-hidden="true" className={`choice-can ${className}`} />
}

export default function ChoiceScreen({ onChoose }: { onChoose: (choice: 'wholesale' | 'event') => void }) {
  return (
    <section className="choice-layout">
      <div className="choice-copy">
        <p className="eyebrow">LET'S WORK TOGETHER</p>
        <h1>How are you looking to enjoy Daydream?</h1>
        <p className="lede">Tell us what you're planning and we'll send you down the right path.</p>
      </div>

      <div className="choice-grid">
        <button className="choice-card wholesale-card" onClick={() => onChoose('wholesale')}>
          <Can src={canImages.cucumber} className="can-left" />
          <div className="choice-icon">↗</div>
          <div className="choice-card-copy">
            <span className="choice-kicker">FOR BUSINESSES</span>
            <h2>Stock Daydream</h2>
            <p>Wholesale pricing, recurring orders and an account built for your business.</p>
            <span className="card-cta">Apply for wholesale <span>→</span></span>
          </div>
        </button>

        <button className="choice-card event-card" onClick={() => onChoose('event')}>
          <Can src={canImages.paloma} className="can-right" />
          <div className="choice-icon">✦</div>
          <div className="choice-card-copy">
            <span className="choice-kicker">FOR EVENTS</span>
            <h2>Bring Daydream to an event</h2>
            <p>Sampling, mocktails, event sales, partnerships and special occasions.</p>
            <span className="card-cta">Tell us about it <span>→</span></span>
          </div>
        </button>
      </div>
    </section>
  )
}
