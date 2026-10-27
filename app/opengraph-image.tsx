import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'Klüp360 · Çocuk kulübü yönetim platformu'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf')),
    readFile(join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf')),
  ])

  const bars = [34, 48, 42, 62, 70, 92]

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0E1116', color: '#fff', fontFamily: 'Noto Sans', position: 'relative' }}>
        {/* nokta dokusu */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', width: 700, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="14" fill="#FFFFFF" />
              <circle cx="31" cy="31" r="15" fill="none" stroke="#0E1116" strokeWidth="5" />
              <circle cx="46" cy="46" r="6.5" fill="#2347D9" stroke="#FFFFFF" strokeWidth="3" />
            </svg>
            <div style={{ display: 'flex', marginLeft: 20, fontSize: 44, fontWeight: 700, letterSpacing: -1.5 }}>
              Klüp<span style={{ color: '#8EA3EE' }}>360</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>Çocuk kulübünüzün tüm yönetimi, tek panelde.</div>
            <div style={{ marginTop: 26, fontSize: 28, color: '#A3AEBF', lineHeight: 1.4 }}>Puantaj, bordro, aidat ve denetim dosyası. MEB yönergesine uyumlu.</div>
          </div>

          <div style={{ display: 'flex', fontSize: 24, color: '#8EA3EE', fontWeight: 700 }}>www.klup360.com</div>
        </div>

        {/* sağ: panel önizlemesi */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', right: 56, top: 120, width: 400, height: 390, background: '#fff', borderRadius: 22, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', color: '#5F6876', fontSize: 20 }}>Tahsilat verimi</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, color: '#0E1116', letterSpacing: -3 }}>%74</div>
            <div style={{ display: 'flex', background: '#E4F4EC', color: '#0B6B42', padding: '6px 14px', borderRadius: 8, fontSize: 20, fontWeight: 700 }}>+8,2 puan</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 150, marginTop: 'auto', borderBottom: '2px solid #E3E6EB', paddingBottom: 0 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ display: 'flex', flex: 1, height: `${h}%`, background: i === bars.length - 1 ? '#2347D9' : '#C9D4FA', borderRadius: '6px 6px 0 0' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, color: '#5F6876', fontSize: 18 }}>
            <span>Mayıs</span><span>Ekim</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Noto Sans', data: regular, weight: 400, style: 'normal' },
        { name: 'Noto Sans', data: bold, weight: 700, style: 'normal' },
      ],
    },
  )
}
