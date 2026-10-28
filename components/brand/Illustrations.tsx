// Klüp360 illüstrasyon seti — Atlas çizgisi: ince nötr çizgiler, tek kobalt vurgu.
// Tamamı satır içi SVG; renkler CSS değişkenlerinden alınır, bu yüzden temayla uyumludur.

const INK = '#0E1116'
const LINE = 'var(--border, #E3E6EB)'
const LINE2 = '#CBD0D8'
const SOFT = 'var(--surface2, #F1F3F6)'
const ACC = 'var(--accent, #2347D9)'
const ACC_L = 'var(--accent-lighter, #EEF2FE)'

type P = { width?: number | string; className?: string }

function Shell({ width = 240, className, children, label }: P & { children: React.ReactNode; label: string }) {
  return (
    <svg className={className} width={width} viewBox="0 0 240 160" fill="none" role="img" aria-label={label}>
      <ellipse cx="120" cy="146" rx="84" ry="6" fill={SOFT} />
      {children}
    </svg>
  )
}

/** Öğrenci listesi boş */
export function EmptyStudents(p: P) {
  return (
    <Shell {...p} label="Henüz öğrenci kaydı yok">
      <rect x="38" y="26" width="164" height="108" rx="12" fill="#fff" stroke={LINE2} />
      <rect x="38" y="26" width="164" height="22" rx="12" fill={SOFT} />
      <rect x="38" y="38" width="164" height="10" fill={SOFT} />
      <circle cx="52" cy="37" r="3" fill={LINE2} /><circle cx="62" cy="37" r="3" fill={LINE2} /><circle cx="72" cy="37" r="3" fill={LINE2} />
      {[62, 84, 106].map((y, i) => (
        <g key={y}>
          <circle cx="58" cy={y + 6} r="8" fill={i === 0 ? ACC_L : SOFT} stroke={i === 0 ? '#C9D4FA' : LINE} />
          <rect x="74" y={y} width={i === 0 ? 70 : 56} height="6" rx="3" fill={i === 0 ? LINE2 : LINE} />
          <rect x="74" y={y + 10} width="38" height="5" rx="2.5" fill={LINE} />
          <rect x="164" y={y + 1} width="26" height="12" rx="6" fill={i === 0 ? ACC_L : SOFT} stroke={LINE} />
        </g>
      ))}
      <circle cx="198" cy="34" r="17" fill={ACC} stroke="#fff" strokeWidth="4" />
      <path d="M198 27v14M191 34h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </Shell>
  )
}

/** Tahsilat / ödeme boş */
export function EmptyPayments(p: P) {
  return (
    <Shell {...p} label="Henüz tahsilat kaydı yok">
      <path d="M62 22h96a6 6 0 0 1 6 6v100l-9-6-9 6-9-6-9 6-9-6-9 6-9-6-9 6-9-6-9 6V28a6 6 0 0 1 6-6z" fill="#fff" stroke={LINE2} />
      <rect x="76" y="40" width="46" height="7" rx="3.5" fill={LINE2} />
      <rect x="76" y="54" width="30" height="5" rx="2.5" fill={LINE} />
      <path d="M76 72h78M76 86h78M76 100h78" stroke={LINE} strokeDasharray="3 4" />
      <rect x="116" y="108" width="38" height="8" rx="4" fill={ACC_L} stroke="#C9D4FA" />
      <circle cx="180" cy="62" r="24" fill="#fff" stroke={LINE2} />
      <circle cx="180" cy="62" r="17" fill={ACC_L} stroke="#C9D4FA" />
      <path d="M173 62.5l5 5 9-10" stroke={ACC} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="58" cy="118" r="10" fill="#fff" stroke={LINE2} /><circle cx="58" cy="118" r="5" fill="none" stroke={LINE2} />
    </Shell>
  )
}

/** Evrak / denetim dosyası boş */
export function EmptyDocs(p: P) {
  return (
    <Shell {...p} label="Henüz evrak yok">
      <path d="M44 52a8 8 0 0 1 8-8h40l10 12h66a8 8 0 0 1 8 8v62a8 8 0 0 1-8 8H52a8 8 0 0 1-8-8z" fill={SOFT} stroke={LINE2} />
      <rect x="62" y="30" width="72" height="88" rx="6" fill="#fff" stroke={LINE2} transform="rotate(-5 98 74)" />
      <rect x="78" y="22" width="76" height="92" rx="6" fill="#fff" stroke={LINE2} />
      <rect x="88" y="36" width="34" height="6" rx="3" fill={LINE2} />
      <path d="M88 52h56M88 62h56M88 72h40" stroke={LINE} strokeWidth="4" strokeLinecap="round" />
      <path d="M44 74h152a0 0 0 0 1 0 0v44a8 8 0 0 1-8 8H52a8 8 0 0 1-8-8z" fill="#fff" stroke={LINE2} />
      <rect x="58" y="90" width="52" height="6" rx="3" fill={LINE} /><rect x="58" y="102" width="34" height="5" rx="2.5" fill={LINE} />
      <circle cx="176" cy="98" r="15" fill={ACC} stroke="#fff" strokeWidth="4" />
      <path d="M176 105V92m-6 5 6-6 6 6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </Shell>
  )
}

/** Giriş / tanıtım — büyük kompozisyon */
export function HeroComposition({ width = 520, className }: P) {
  return (
    <svg className={className} width={width} viewBox="0 0 520 420" fill="none" role="img" aria-label="Klüp360 panel önizlemesi">
      <defs>
        <pattern id="k360dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.2" fill="rgba(255,255,255,.14)" /></pattern>
      </defs>
      <rect width="520" height="420" fill="url(#k360dots)" />
      {/* ana kart */}
      <rect x="40" y="52" width="400" height="300" rx="18" fill="#fff" />
      <rect x="40" y="52" width="400" height="44" rx="18" fill="#F8F9FB" />
      <rect x="40" y="80" width="400" height="16" fill="#F8F9FB" />
      <path d="M40 96h400" stroke="#E3E6EB" />
      <circle cx="62" cy="74" r="4" fill="#E3E6EB" /><circle cx="76" cy="74" r="4" fill="#E3E6EB" /><circle cx="90" cy="74" r="4" fill="#E3E6EB" />
      <rect x="120" y="66" width="140" height="16" rx="8" fill="#EEF0F4" />
      {/* kpi şeridi */}
      <rect x="60" y="114" width="360" height="62" rx="10" fill="#fff" stroke="#E3E6EB" />
      <path d="M180 114v62M300 114v62" stroke="#E3E6EB" />
      <rect x="76" y="128" width="40" height="6" rx="3" fill="#CBD0D8" /><rect x="76" y="144" width="62" height="16" rx="4" fill="#0E1116" />
      <rect x="196" y="128" width="46" height="6" rx="3" fill="#CBD0D8" /><rect x="196" y="144" width="48" height="16" rx="4" fill="#0E1116" />
      <rect x="316" y="128" width="38" height="6" rx="3" fill="#CBD0D8" /><rect x="316" y="144" width="56" height="16" rx="4" fill="#2347D9" />
      {/* grafik */}
      <rect x="60" y="192" width="214" height="142" rx="10" fill="#fff" stroke="#E3E6EB" />
      <rect x="74" y="206" width="70" height="7" rx="3.5" fill="#CBD0D8" />
      {[0, 1, 2, 3].map(i => <path key={i} d={`M74 ${236 + i * 22}h186`} stroke="#EEF0F3" strokeDasharray="3 4" />)}
      {[
        [84, 270, 40, 28], [112, 262, 52, 40], [140, 252, 60, 52], [168, 244, 70, 62], [196, 236, 80, 76], [224, 226, 92, 88],
      ].map(([x, , h1, h2], i) => (
        <g key={i}>
          <rect x={x} y={324 - h1 + 4 - 0} width="11" height={h1 - 4} rx="2" fill={i === 5 ? '#2347D9' : '#8EA3EE'} />
          <rect x={x + 13} y={324 - h2 + 8} width="11" height={h2 - 8} rx="2" fill="#C5CAD3" />
        </g>
      ))}
      <path d="M72 326h192" stroke="#CBD0D8" />
      {/* halka */}
      <rect x="286" y="192" width="134" height="142" rx="10" fill="#fff" stroke="#E3E6EB" />
      <circle cx="353" cy="252" r="30" stroke="#EEF0F4" strokeWidth="9" />
      <circle cx="353" cy="252" r="30" stroke="#2347D9" strokeWidth="9" strokeLinecap="round" strokeDasharray="140 189" transform="rotate(-90 353 252)" />
      <rect x="337" y="244" width="32" height="12" rx="3" fill="#0E1116" />
      <rect x="318" y="296" width="70" height="6" rx="3" fill="#CBD0D8" /><rect x="330" y="310" width="46" height="5" rx="2.5" fill="#E3E6EB" />
      {/* yüzen rozetler */}
      <g>
        <rect x="352" y="30" width="148" height="46" rx="12" fill="#0E1116" stroke="rgba(255,255,255,.14)" />
        <circle cx="376" cy="53" r="12" fill="#0B7A4B" /><path d="M370 53.5l4 4 7-8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="396" y="44" width="70" height="7" rx="3.5" fill="#fff" /><rect x="396" y="57" width="46" height="5" rx="2.5" fill="#6A7280" />
      </g>
      <g>
        <rect x="14" y="300" width="150" height="46" rx="12" fill="#fff" stroke="#E3E6EB" />
        <circle cx="38" cy="323" r="12" fill="#EEF2FE" /><path d="M32 323h12M38 317v12" stroke="#2347D9" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="58" y="314" width="74" height="7" rx="3.5" fill="#0E1116" /><rect x="58" y="327" width="48" height="5" rx="2.5" fill="#CBD0D8" />
      </g>
      <g>
        <rect x="380" y="360" width="118" height="40" rx="12" fill="#fff" stroke="#E3E6EB" />
        <circle cx="402" cy="380" r="9" fill="#FFF1D6" /><path d="M402 375v6l3 2" stroke="#C77D00" strokeWidth="2" strokeLinecap="round" />
        <rect x="418" y="372" width="62" height="6" rx="3" fill="#0E1116" /><rect x="418" y="383" width="40" height="5" rx="2.5" fill="#CBD0D8" />
      </g>
    </svg>
  )
}

/** 404 / bulunamadı */
export function NotFoundArt(p: P) {
  return (
    <Shell {...p} label="Sayfa bulunamadı">
      <circle cx="120" cy="72" r="46" fill="#fff" stroke={LINE2} />
      <circle cx="120" cy="72" r="30" stroke={LINE} strokeDasharray="4 5" />
      <circle cx="120" cy="72" r="6" fill={INK} />
      <circle cx="158" cy="108" r="14" fill={ACC} stroke="#fff" strokeWidth="4" />
      <path d="M153 108h10M158 103v10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" transform="rotate(45 158 108)" />
      <path d="M40 120h40M160 40h40M52 52h24" stroke={LINE2} strokeLinecap="round" />
    </Shell>
  )
}
