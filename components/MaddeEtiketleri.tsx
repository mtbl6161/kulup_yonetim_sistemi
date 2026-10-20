// Denetim evrak maddesi etiketleri (sistem belgesi / yıllık / isteğe bağlı) — okul ve denetçi ekranlarında ortak
import type { DenetimMadde } from '@/lib/denetimDosyasi'

const temel: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
  fontSize: 11, fontWeight: 600, lineHeight: '18px', letterSpacing: 0.2,
  padding: '0 7px', borderRadius: 4, borderWidth: 1, borderStyle: 'solid',
}

const STIL = {
  sistem: { ...temel, color: '#35566f', background: '#f2f6f9', borderColor: '#cbd8e3' },
  yillik: { ...temel, color: '#6b5420', background: '#faf6ec', borderColor: '#e4d6b4' },
  istege: { ...temel, color: 'var(--text2)', background: 'transparent', borderColor: 'var(--border)' },
}

export default function MaddeEtiketleri({ madde }: { madde: Pick<DenetimMadde, 'tip' | 'yillik' | 'zorunlu'> }) {
  return (
    <>
      {madde.tip === 'otomatik' && <span style={STIL.sistem}>Sistem belgesi</span>}
      {madde.yillik && <span style={STIL.yillik}>Yıllık</span>}
      {!madde.zorunlu && <span style={STIL.istege}>İsteğe bağlı</span>}
    </>
  )
}
