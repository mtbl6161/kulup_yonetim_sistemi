'use client' // Kök düzen çöktüğünde devreye girer; kendi <html> ve <body>'sini çizer, global stiller yüklenmez

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', background: '#f5f6f8', color: '#0e1116' }}>
        <title>Klüp360 · Hata</title>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2347d9', letterSpacing: '0.08em', marginBottom: 10 }}>BEKLENMEDİK HATA</div>
            <h1 style={{ fontSize: 24, fontWeight: 650, margin: '0 0 10px' }}>Klüp360 şu an açılamadı</h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#3f4753', margin: '0 0 22px' }}>Verileriniz güvende. Sayfayı yeniden deneyin; sorun sürerse birkaç dakika sonra tekrar girin.</p>
            <button type="button" onClick={() => retry()} style={{ background: '#2347d9', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Tekrar dene</button>
          </div>
        </div>
      </body>
    </html>
  )
}
