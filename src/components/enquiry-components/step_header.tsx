type StepHeaderProps = {
  eyebrow: string
  title: string
  description?: string
  step?: number
  total?: number 
}

export default function StepHeader({ eyebrow, title, description, step, total = 0 }: StepHeaderProps) {
  return (
    <div className="step-header">
      <div className="step-meta">
        <span className="eyebrow">{eyebrow}</span>
        {step && <span className="step-count">STEP {step} OF {total}</span>}
      </div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {step && (
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${(step / total) * 100}%` }} />
        </div>
      )}
    </div>
  )
}
