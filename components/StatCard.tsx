interface Props {
  label: string
  value: string | number
  sub?: string
  variant?: 'default' | 'orange' | 'red' | 'teal'
  icon?: string
}

export default function StatCard({ label, value, sub, variant = 'default', icon }: Props) {
  return (
    <div className={`stat-card ${variant !== 'default' ? variant : ''}`}>
      {icon && <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
