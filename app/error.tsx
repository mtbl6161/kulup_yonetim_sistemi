'use client' // Hata sınırları istemci bileşeni olmalı

import { useEffect } from 'react'
import HataEkrani from '@/components/HataEkrani'

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  const kimlik = error instanceof Error && 'digest' in error ? String((error as Error & { digest?: string }).digest || '') : ''

  return (
    <HataEkrani
      kod="BEKLENMEDİK HATA"
      baslik="Bu sayfa yüklenirken bir sorun oluştu"
      aciklama={`Verileriniz güvende; yalnızca bu ekran açılamadı. Tekrar deneyin, sorun sürerse bize bildirin${kimlik ? ` (hata kodu: ${kimlik})` : ''}.`}
      eylem={<button type="button" className="btn btn-primary" onClick={() => retry()}>Tekrar dene</button>}
    />
  )
}
