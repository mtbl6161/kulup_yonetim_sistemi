import HataEkrani from '@/components/HataEkrani'

export default function NotFound() {
  return (
    <HataEkrani
      kod="404"
      baslik="Sayfa bulunamadı"
      aciklama="Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir. Adresi kontrol edin veya yan menüden devam edin."
    />
  )
}
