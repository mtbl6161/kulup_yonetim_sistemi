'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { AyProvider, useAy } from '@/lib/AyContext'

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { ay, yil, setAyYil } = useAy()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar ay={ay} yil={yil} onAyChange={setAyYil} />
      <main
        id="main-content"
        style={{
          marginLeft: 240,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.25s',
        }}
      >
        {children}
      </main>
    </div>
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AyProvider>
      <InnerLayout>{children}</InnerLayout>
    </AyProvider>
  )
}
