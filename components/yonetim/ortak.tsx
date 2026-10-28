'use client'
// Yönetim konsolunun ortak tipleri, API çağrısı, lisans durumu hesabı ve küçük arayüz parçaları.
import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/AuthContext'

// ── Tipler ─────────────────────────────────────────────────────
export type OdemeDurumu = 'aktif' | 'deneme' | 'borclu'

export interface KullaniciSatir {
  id: string; rol: string; okul_id: number | null; created_at: string
  okullar: {
    id: number; ad: string; lisans_bitis?: string | null; odeme_durumu?: OdemeDurumu | string | null
    il_id?: number | null; created_at?: string
    ogrenci_sayisi?: number; personel_sayisi?: number; bordro_sayisi?: number; tahsilat_sayisi?: number
  } | null
  email?: string; last_login?: string | null; banned?: boolean
  iller?: { id: number; ad: string } | null
}

/** Bir kurum = okul kaydı + yöneticisi (ilk yönetici hesabı) */
export interface Kurum {
  id: number
  ad: string
  ilId: number | null
  lisansBitis: string | null
  odemeDurumu: string | null
  kayit: string
  yonetici: KullaniciSatir
  kullaniciSayisi: number
  ogrenci: number; personel: number; bordro: number; tahsilat: number
}

export interface OdemeSatir {
  id: number; okul_id: number; tutar: number; odeme_tarihi: string; odeme_yontemi: string; aciklama?: string | null
  okullar?: { ad: string } | null
}
export interface DuyuruSatir { id: number; baslik: string; icerik: string; tur: string; aktif: boolean; created_at: string }
export interface LogSatir {
  id: number; okul_id: number | null; islem: string; tablo: string; aciklama: string; created_at: string
  okullar?: { ad: string } | null
}
export interface TalepSatir {
  id: number; okul_id: number | null; il_id: number | null; status: 'beklemede' | 'onaylandi' | 'reddedildi' | string
  ad_soyad: string | null; email: string | null; telefon: string | null; notlar: string | null; created_at: string
  okullar?: { id: number; ad: string } | null; iller?: { id: number; ad: string } | null
}
export interface IlSatir { id: number; ad: string; okullar: { id: number; ad: string }[] }

export type Sekme = 'ozet' | 'kurumlar' | 'tahsilat' | 'talepler' | 'izler' | 'duyurular' | 'tatiller' | 'ayarlar'

// ── API ────────────────────────────────────────────────────────
export interface ApiSonuc<T> { ok: boolean; veri: T | null; hata: string | null }

/** Oturum anahtarıyla /api/admin/* çağrısı; hata mesajını Türkçe döndürür. */
export function useAdminApi() {
  const { session } = useAuth()
  return useCallback(async <T,>(yol: string, init?: { method?: string; govde?: unknown }): Promise<ApiSonuc<T>> => {
    if (!session) return { ok: false, veri: null, hata: 'Oturum bulunamadı. Sayfayı yenileyin.' }
    try {
      const res = await fetch(yol, {
        method: init?.method || 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: init?.govde !== undefined ? JSON.stringify(init.govde) : undefined,
      })
      const veri = await res.json().catch(() => null)
      if (!res.ok) return { ok: false, veri: null, hata: (veri && (veri.error || veri.hata)) || `İstek başarısız (${res.status})` }
      return { ok: true, veri: veri as T, hata: null }
    } catch {
      return { ok: false, veri: null, hata: 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.' }
    }
  }, [session])
}

// ── Kurum listesi ve lisans durumu ─────────────────────────────
/** Profil listesinden kurum listesi: aynı okulun birden çok kullanıcısı tek satırda toplanır. */
export function kurumlariOlustur(liste: KullaniciSatir[]): Kurum[] {
  const harita = new Map<number, Kurum>()
  for (const k of liste) {
    if (!k.okullar || k.rol === 'super_admin' || k.rol === 'denetim_yetkilisi') continue
    const o = k.okullar
    const mevcut = harita.get(o.id)
    if (mevcut) { mevcut.kullaniciSayisi++; continue }
    harita.set(o.id, {
      id: o.id, ad: o.ad, ilId: o.il_id ?? null, lisansBitis: o.lisans_bitis ?? null, odemeDurumu: o.odeme_durumu ?? null,
      kayit: o.created_at || k.created_at, yonetici: k, kullaniciSayisi: 1,
      ogrenci: o.ogrenci_sayisi || 0, personel: o.personel_sayisi || 0, bordro: o.bordro_sayisi || 0, tahsilat: o.tahsilat_sayisi || 0,
    })
  }
  return [...harita.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
}

export type LisansTuru = 'aktif' | 'deneme' | 'doldu' | 'pasif'
export interface LisansBilgi { tur: LisansTuru; etiket: string; rozet: string; kalanGun: number | null }

const GUN = 86400000
export function kalanGun(bitis: string | null | undefined, simdi = Date.now()): number | null {
  if (!bitis) return null
  const d = new Date(bitis.length <= 10 ? bitis + 'T23:59:59' : bitis).getTime()
  return Math.ceil((d - simdi) / GUN)
}

export function lisansBilgisi(k: Pick<Kurum, 'lisansBitis' | 'odemeDurumu' | 'yonetici'>, simdi = Date.now()): LisansBilgi {
  const kalan = kalanGun(k.lisansBitis, simdi)
  if (k.yonetici.banned) return { tur: 'pasif', etiket: 'Pasif', rozet: 'badge-gray', kalanGun: kalan }
  if (k.odemeDurumu === 'borclu' || (kalan !== null && kalan < 0)) return { tur: 'doldu', etiket: 'Süresi doldu', rozet: 'badge-red', kalanGun: kalan }
  if (k.odemeDurumu === 'deneme') return { tur: 'deneme', etiket: kalan !== null ? `Deneme · ${kalan} gün` : 'Deneme', rozet: 'badge-blue', kalanGun: kalan }
  return { tur: 'aktif', etiket: 'Aktif', rozet: 'badge-green', kalanGun: kalan }
}

// ── Biçimlendirme ──────────────────────────────────────────────
export const tl = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n)
export const tarih = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('tr-TR') : '—')
export const isoGun = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function goreceZaman(s: string | null | undefined, simdi = Date.now()): string {
  if (!s) return 'hiç'
  const fark = simdi - new Date(s).getTime()
  const dk = Math.round(fark / 60000)
  if (dk < 1) return 'az önce'
  if (dk < 60) return `${dk} dk önce`
  const sa = Math.round(dk / 60)
  if (sa < 24) return `${sa} saat önce`
  const g = Math.round(sa / 24)
  if (g === 1) return 'dün'
  if (g < 7) return `${g} gün önce`
  if (g < 35) return `${Math.round(g / 7)} hafta önce`
  return tarih(s)
}

export const ISLEM_ETIKET: Record<string, { etiket: string; rozet: string }> = {
  ekle: { etiket: 'Ekleme', rozet: 'badge-green' },
  guncelle: { etiket: 'Güncelleme', rozet: 'badge-blue' },
  sil: { etiket: 'Silme', rozet: 'badge-red' },
  import: { etiket: 'İçe aktarma', rozet: 'badge-blue' },
  hesapla: { etiket: 'Hesaplama', rozet: 'badge-orange' },
  ode: { etiket: 'Ödeme', rozet: 'badge-green' },
  login: { etiket: 'Giriş', rozet: 'badge-gray' },
  ayarlar: { etiket: 'Ayar', rozet: 'badge-gray' },
  duyuru_ekle: { etiket: 'Duyuru', rozet: 'badge-blue' },
}
export const BOLUM_ETIKET: Record<string, string> = {
  ogrenciler: 'Öğrenciler', personel: 'Personel', tahsilat: 'Tahsilat', bordro: 'Bordro', giderler: 'Gider',
  ayarlar: 'Ayarlar', okullar: 'Kurum', profiller: 'Kullanıcı', auth: 'Oturum', okul_odemeleri: 'Abonelik ödemesi',
  duyurular: 'Duyuru', sistem_ayarlari: 'Sistem', denetci_talepleri: 'Denetçi talebi',
}

// ── Arayüz parçaları ───────────────────────────────────────────
export function Bolum({ baslik, sag, children, dolgu = true }: { baslik?: ReactNode; sag?: ReactNode; children: ReactNode; dolgu?: boolean }) {
  return (
    <section className="yk-kart">
      {(baslik || sag) && (
        <div className="yk-kart-bas">
          {baslik && <h2>{baslik}</h2>}
          {sag && <div className="yk-kart-sag">{sag}</div>}
        </div>
      )}
      <div style={dolgu ? { padding: '0 18px 16px' } : undefined}>{children}</div>
    </section>
  )
}

export function Bos({ children }: { children: ReactNode }) {
  return <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>{children}</div>
}

export function Sayfalama({ sayfa, toplam, boyut, onSayfa }: { sayfa: number; toplam: number; boyut: number; onSayfa: (s: number) => void }) {
  const son = Math.max(1, Math.ceil(toplam / boyut))
  const bas = toplam ? (sayfa - 1) * boyut + 1 : 0
  return (
    <div className="yk-sayfalama">
      <span>{bas}–{Math.min(sayfa * boyut, toplam)} / {toplam.toLocaleString('tr-TR')}</span>
      <span style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onSayfa(sayfa - 1)} disabled={sayfa <= 1} aria-label="Önceki sayfa">‹</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onSayfa(sayfa + 1)} disabled={sayfa >= son} aria-label="Sonraki sayfa">›</button>
      </span>
    </div>
  )
}

export function Pencere({ baslik, aciklama, kapat, children, genislik = 480 }: { baslik: string; aciklama?: string; kapat: () => void; children: ReactNode; genislik?: number }) {
  return (
    <div className="modal-overlay" onClick={kapat} role="presentation">
      <div className="modal-box" role="dialog" aria-modal="true" aria-label={baslik} onClick={e => e.stopPropagation()} style={{ maxWidth: genislik, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{baslik}</h2>
            {aciklama && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text3)' }}>{aciklama}</p>}
          </div>
          <button type="button" className="btn btn-secondary btn-icon" onClick={kapat} aria-label="Kapat">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Filtre<T extends string>({ secenekler, deger, onDegis, etiket }: { secenekler: { id: T; ad: string; sayi?: number }[]; deger: T; onDegis: (v: T) => void; etiket: string }) {
  return (
    <div role="group" aria-label={etiket} className="yk-segment">
      {secenekler.map(s => (
        <button key={s.id} type="button" aria-pressed={deger === s.id} className={deger === s.id ? 'on' : ''} onClick={() => onDegis(s.id)}>
          {s.ad}{s.sayi !== undefined && <span>{s.sayi}</span>}
        </button>
      ))}
    </div>
  )
}
