/* eslint-disable @typescript-eslint/no-explicit-any */
export default function OptionCards({ options, value, onChange, columns = 2 }:any) {
  return (
    <div className={`option-grid option-grid-${columns}`}>
      {options.map((option:any) => (
        <button
          type="button"
          key={option.value}
          className={`option-card ${value === option.value ? 'selected' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <span className="option-icon">{option.icon}</span>}
          <span>{option.label}</span>
          {value === option.value && <span className="option-check">✓</span>}
        </button>
      ))}
    </div>
  )
}
