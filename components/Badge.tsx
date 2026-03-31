type Variant = 'green' | 'red' | 'orange' | 'gray' | 'blue'

interface Props {
  variant?: Variant
  children: React.ReactNode
}

export default function Badge({ variant = 'gray', children }: Props) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}
