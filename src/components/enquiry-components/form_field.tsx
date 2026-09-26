// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FormField({ label, hint, children, className = '' }: any) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {children}
    </label>
  )
}
