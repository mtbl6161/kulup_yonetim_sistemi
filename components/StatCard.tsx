import React from 'react'

interface Props {
  title: string
  value: string | number
  trend?: string
  variant?: 'default' | 'orange' | 'red' | 'teal'
  icon?: React.ReactNode
  color?: string
}

export default function StatCard({ title, value, trend, variant = 'default', icon, color }: Props) {
  return (
    <div className={`stat-card ${variant !== 'default' ? variant : ''}`} style={{ borderLeft: color ? `4px solid ${color}` : undefined }}>
      {icon && <div style={{ fontSize: 20, marginBottom: 8, color: color }}>{icon}</div>}
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {trend && <div className="stat-sub">{trend}</div>}
    </div>
  )
}
