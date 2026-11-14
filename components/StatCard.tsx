import React from 'react'

interface Props {
  title: string
  value: string | number
  trend?: string
  variant?: 'default' | 'orange' | 'red' | 'teal'
  icon?: React.ReactNode
  color?: string
}

// Simge kutusunun rengi: açık renk verilmediyse kartın türünden gelir.
const CHIP_SINIFI: Record<NonNullable<Props['variant']>, string> = {
  default: '',
  orange: 'coral',
  red: 'red',
  teal: 'green',
}

export default function StatCard({ title, value, trend, variant = 'default', icon, color }: Props) {
  const chipStili = color
    ? { background: `color-mix(in srgb, ${color} 12%, white)`, color }
    : undefined
  return (
    <div className={`stat-card ${variant !== 'default' ? variant : ''}`}>
      {icon && (
        <div className={`stat-chip ${CHIP_SINIFI[variant]}`} style={chipStili} aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {trend && <div className="stat-sub">{trend}</div>}
    </div>
  )
}
