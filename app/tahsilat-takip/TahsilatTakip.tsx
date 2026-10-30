'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { perdeKapat } from '@/lib/perdeKapat'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfAc, PDF_RENK } from '@/lib/pdf'
import type { CellHookData } from '@/lib/pdf'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, fmtTL } from '@/lib/hesaplama'
import { TahsilatKategori, TahsilatVeriKaynagi, TahsilatKaydi, TahsilatTaksitPlani, Ogrenci, Ayarlar, kulupOgrencisi, Birim, birimKurumAdi } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'
import { sayiCoz } from '@/components/SayiInput'
import { taksitAcilabilir, taksitKey, anaDonem, esitBol, aylikVadeler, fmtVade } from '@/lib/taksit'
import { ClipboardList, Plus, Pencil, Trash2, Users, RefreshCw, X, Grid3x3, FolderCog, Check, FileWarning, Download, Layers, AlertTriangle } from 'lucide-react'
import { hataMesaji } from '@/lib/hata'
import { useYukleme } from '@/lib/useYukleme'
import { useDegisince } from '@/lib/useDegisince'
import {
  TIP_LABELS, TIP_ICON, FormState, BOS_FORM, PlanForm, TurFiltre, ucretBul, kapsamOgrencileri, planDurumu, turUygun, aramaUygun, AramaKutusu, Donem, donemGeldi, bugunISO, sayiYaz, hesaplaDonemler, badge, popKonum, emptyBox, thStyle, tdStyle, statBox, statLabel, statVal, statAlt, TurRozet,
} from './yardimcilar'
import KategoriModal from '@/app/tahsilat-takip/KategoriModal'
import PlanModal from './PlanModal'

// İyimser güncellemelerde sunucu kimliği gelene kadar kullanılan geçici negatif kimlik
let geciciSayac = 0
const geciciId = () => --geciciSayac

export default function TahsilatTakip({ birim }: { birim: Birim }) {
  const { ay, yil } = useAy()
  const { okul, profil } = useAuth()
  const okulId = okul?.id ?? profil?.okul_id ?? null

  const [view, setView] = useState<'takip' | 'yonetim' | 'rapor'>('takip')
  const [kategoriler, setKategoriler] = useState<TahsilatKategori[]>([])
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [uyelikler, setUyelikler] = useState<{ kategori_id: number; ogrenci_id: number }[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Takip ızgarası
  const [seciliKategoriId, setSeciliKategoriId] = useState<number | null>(null)
  const [turFiltre, setTurFiltre] = useState<TurFiltre>('hepsi')
  const [takipArama, setTakipArama] = useState('')
  const varsayilanEgitimYili = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1
  const [egitimYili, setEgitimYili] = useState(varsayilanEgitimYili)
  const [kayitlar, setKayitlar] = useState<TahsilatKaydi[]>([])
  const [kayitLoading, setKayitLoading] = useState(false)
  const [popover, setPopover] = useState<{ ogrenciId: number; donem: string; rect: DOMRect; mevcut?: TahsilatKaydi } | null>(null)
  const [pTutar, setPTutar] = useState('')
  const [pTarih, setPTarih] = useState(bugunISO())
  const [pAciklama, setPAciklama] = useState('')

  // Kategori formu
  const [modalAcik, setModalAcik] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(BOS_FORM)
  const [seciliOgrenci, setSeciliOgrenci] = useState<Set<number>>(new Set())
  const [ogrenciArama, setOgrenciArama] = useState('')
  const [saving, setSaving] = useState(false)
  const [conf, setConf] = useState<{ id: number; ad: string } | null>(null)

  // Öğrenci bazlı taksit planları (seçili kategori)
  const [planlar, setPlanlar] = useState<TahsilatTaksitPlani[]>([])
  const [planForm, setPlanForm] = useState<PlanForm | null>(null)
  const [planSaving, setPlanSaving] = useState(false)
  const [planMsg, setPlanMsg] = useState('')
  const [taksitPop, setTaksitPop] = useState<{ o: Ogrenci; d: Donem; rect: DOMRect } | null>(null)
  const [planSilOnay, setPlanSilOnay] = useState<TahsilatTaksitPlani | null>(null)
  const [bugun] = useState(bugunISO) // sayfa açıkken sabit; her çizimde yeniden hesaplanmaz

  // Ödeme durumu raporu (state burada; hesaplar raporun bölümünde)
  const [rKategoriId, setRKategoriId] = useState<number | null>(null)
  const [rDonem, setRDonem] = useState<string>('')
  const [rSinif, setRSinif] = useState<string>('')
  const [rDurum, setRDurum] = useState<'hepsi' | 'odeyen' | 'odemeyen' | 'geciken'>('hepsi')
  const [rArama, setRArama] = useState('')
  // Seçili kategori+dönemin kayıtları (peşin + taksit) ve taksit planları
  const [rKayitlar, setRKayitlar] = useState<TahsilatKaydi[]>([])
  const [rPlanlar, setRPlanlar] = useState<TahsilatTaksitPlani[]>([])
  const [rLoading, setRLoading] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: kat }, { data: ogr }, { data: uye }, { data: ayr }] = await Promise.all([
      supabase.from('tahsilat_kategorileri').select('*').eq('birim', birim).order('sira').order('id'),
      supabase.from('ogrenciler').select('*').order('soyad'),
      supabase.from('tahsilat_kategori_ogrenci').select('kategori_id, ogrenci_id'),
      supabase.from('ayarlar').select('*').single(),
    ])
    setKategoriler(kat || [])
    // Ad Soyad'a göre Türkçe alfabetik sıra (Ç, Ğ, İ, Ö, Ş, Ü doğru yerde)
    // Kulüp tahsilatları yalnızca kulübe kayıtlı öğrencileri kapsar
    setOgrenciler((ogr || []).filter(o => o.aktif !== false && (birim !== 'kulup' || kulupOgrencisi(o)))
      .sort((a, b) => `${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`, 'tr', { sensitivity: 'base' })))
    setUyelikler(uye || [])
    setAyarlar(ayr || null)
    setSeciliKategoriId(prev => prev ?? (kat && kat.length ? kat[0].id : null))
    setLoading(false)
  }, [birim])

  useYukleme(load)

  const seciliKategori = useMemo(() => kategoriler.find(k => k.id === seciliKategoriId) || null, [kategoriler, seciliKategoriId])

  // Seçili kategori kayıtlarını çek
  const saltOkunur = seciliKategori?.veri_kaynagi === 'otomatik_kulup'

  const loadKayitlar = useCallback(async (katId: number) => {
    setKayitLoading(true)
    const [{ data }, { data: pl }] = await Promise.all([
      supabase.from('tahsilat_kayitlari').select('*').eq('kategori_id', katId),
      supabase.from('tahsilat_taksit_planlari').select('*').eq('kategori_id', katId),
    ])
    setKayitlar(data || [])
    setPlanlar(pl || [])
    setKayitLoading(false)
  }, [])

  // Kulüp (otomatik): mevcut tahsilat/aidat verisini aya göre toplayıp salt-okunur göster
  const loadKulupTahsilat = useCallback(async (katId: number, ey: number) => {
    setKayitLoading(true)
    const { data } = await supabase.from('tahsilat').select('ogrenci_id, ay, yil, tutar').in('yil', [ey, ey + 1])
    const agg = new Map<string, number>()
    ;(data || []).forEach(t => {
      const key = `${t.ogrenci_id}|${t.yil}-${String(t.ay).padStart(2, '0')}`
      agg.set(key, (agg.get(key) || 0) + Number(t.tutar || 0))
    })
    const arr: TahsilatKaydi[] = Array.from(agg.entries()).map(([k, tutar], i) => {
      const [oid, donem] = k.split('|')
      return { id: -(i + 1), kategori_id: katId, ogrenci_id: Number(oid), donem, tutar }
    })
    setKayitlar(arr)
    setPlanlar([])
    setKayitLoading(false)
  }, [])

  useYukleme(() => {
    if (!seciliKategori) { setKayitlar([]); return }
    if (seciliKategori.veri_kaynagi === 'otomatik_kulup') loadKulupTahsilat(seciliKategori.id, egitimYili)
    else loadKayitlar(seciliKategori.id)
  }, [seciliKategoriId, seciliKategori?.veri_kaynagi, egitimYili])

  function bilgi(text: string, sure = 3000) { setMsg(text); if (sure) setTimeout(() => setMsg(''), sure) }

  function ogrenciSayisi(k: TahsilatKategori): { toplam: number; kulup: number; okul: number } {
    const list = kapsamOgrencileri(k, ogrenciler, uyelikler)
    const kulup = list.filter(kulupOgrencisi).length
    return { toplam: list.length, kulup, okul: list.length - kulup }
  }

  // ── Izgara: dönemler ve üyeler ──
  const donemler = useMemo<Donem[]>(() => hesaplaDonemler(seciliKategori, egitimYili), [seciliKategori, egitimYili])

  // Kategorinin tüm kapsamı (tür filtresinden bağımsız) ve ekranda görünen kısım
  const kapsamTum = useMemo<Ogrenci[]>(() => seciliKategori ? kapsamOgrencileri(seciliKategori, ogrenciler, uyelikler) : [], [seciliKategori, ogrenciler, uyelikler])
  const uyeOgrenciler = useMemo<Ogrenci[]>(() => kapsamTum.filter(o => turUygun(o, turFiltre)), [kapsamTum, turFiltre])
  const gorunenOgrenciler = useMemo<Ogrenci[]>(() => uyeOgrenciler.filter(o => aramaUygun(o, takipArama)), [uyeOgrenciler, takipArama])

  const kayitMap = useMemo(() => {
    const m = new Map<string, TahsilatKaydi>()
    kayitlar.forEach(k => m.set(`${k.ogrenci_id}|${k.donem}`, k))
    return m
  }, [kayitlar])

  function kayitBul(ogrenciId: number, donem: string) { return kayitMap.get(`${ogrenciId}|${donem}`) }

  // ── Öğrenci bazlı taksit planları ──
  const planMap = useMemo(() => {
    const m = new Map<string, TahsilatTaksitPlani>()
    planlar.forEach(p => m.set(`${p.ogrenci_id}|${p.donem}`, p))
    return m
  }, [planlar])
  const planBul = (ogrenciId: number, donem: string) => planMap.get(`${ogrenciId}|${donem}`)
  const planDurum = (p: TahsilatTaksitPlani) => planDurumu(p, key => kayitMap.get(`${p.ogrenci_id}|${key}`), bugun)

  function planFormHesapla(f: PlanForm, patch: Partial<PlanForm>): PlanForm {
    const n = { ...f, ...patch }
    const toplam = sayiCoz(n.toplam) || 0
    return { ...n, vadeler: n.ilkVade ? aylikVadeler(n.ilkVade, n.adet) : n.vadeler, tutarlar: esitBol(toplam, n.adet).map(sayiYaz) }
  }

  function planAc(o: Ogrenci, d: Donem) {
    if (!seciliKategori) return
    setTaksitPop(null); setPlanMsg('')
    const mevcut = planBul(o.id, d.key)
    if (mevcut) {
      const pd = planDurum(mevcut)
      setPlanForm({
        o, d, planId: mevcut.id, odenenNo: pd.taksitler.filter(t => t.kayit).map(t => t.no),
        toplam: sayiYaz(pd.toplam), adet: pd.adet, ilkVade: mevcut.vadeler[0] || bugun,
        vadeler: [...mevcut.vadeler], tutarlar: mevcut.tutarlar.map(sayiYaz), aciklama: mevcut.aciklama || '',
      })
      return
    }
    const ucret = ucretBul(seciliKategori, o)
    setPlanForm(planFormHesapla(
      { o, d, planId: null, odenenNo: [], toplam: sayiYaz(ucret), adet: 2, ilkVade: bugun, vadeler: [], tutarlar: [], aciklama: '' },
      {},
    ))
  }

  async function planKaydet() {
    if (!planForm || !seciliKategori || !okulId) return
    const f = planForm
    const tutarlar = f.tutarlar.map(t => sayiCoz(t) ?? NaN)
    if (f.vadeler.some(v => !v)) { setPlanMsg('❌ Tüm taksitlerin vade tarihini girin.'); return }
    if (tutarlar.some(t => isNaN(t) || t <= 0)) { setPlanMsg('❌ Her taksitin tutarı 0\'dan büyük olmalı.'); return }
    const enBuyukOdenen = Math.max(0, ...f.odenenNo)
    if (f.adet < enBuyukOdenen) { setPlanMsg(`❌ ${enBuyukOdenen}. taksit ödenmiş; taksit sayısı bundan az olamaz.`); return }
    setPlanSaving(true)
    const payload = { vadeler: f.vadeler, tutarlar, aciklama: f.aciklama.trim() || null }
    const { error } = f.planId
      ? await supabase.from('tahsilat_taksit_planlari').update(payload).eq('id', f.planId)
      : await supabase.from('tahsilat_taksit_planlari').insert({ ...payload, kategori_id: seciliKategori.id, ogrenci_id: f.o.id, donem: f.d.key, okul_id: okulId })
    setPlanSaving(false)
    if (error) { setPlanMsg('❌ Kayıt hatası: ' + error.message); return }
    setPlanForm(null)
    bilgi(`✅ ${f.o.ad} ${f.o.soyad} için ${f.adet} taksitlik plan ${f.planId ? 'güncellendi' : 'oluşturuldu'}.`)
    loadKayitlar(seciliKategori.id)
  }

  async function planSil() {
    if (!planSilOnay || !seciliKategori) return
    const p = planSilOnay
    setPlanSilOnay(null); setTaksitPop(null)
    const { error } = await supabase.from('tahsilat_taksit_planlari').delete().eq('id', p.id)
    if (error) { bilgi('❌ Plan silinemedi: ' + error.message, 5000); return }
    bilgi('✅ Taksit planı kaldırıldı.')
    loadKayitlar(seciliKategori.id)
  }

  async function taksitOde(p: TahsilatTaksitPlani, no: number) {
    if (!okulId) return
    const donem = taksitKey(p.donem, no)
    const tutar = Number(p.tutarlar[no - 1]) || null
    const optimistik: TahsilatKaydi = { id: geciciId(), kategori_id: p.kategori_id, ogrenci_id: p.ogrenci_id, donem, tutar, tarih: bugun }
    setKayitlar(prev => [...prev, optimistik])
    const { data, error } = await supabase.from('tahsilat_kayitlari')
      .insert({ kategori_id: p.kategori_id, ogrenci_id: p.ogrenci_id, donem, tutar, tarih: bugun, okul_id: okulId })
      .select('*').single()
    if (error) {
      setKayitlar(prev => prev.filter(k => k.id !== optimistik.id))
      bilgi('❌ Taksit işaretlenemedi: ' + error.message, 4000)
    } else if (data) {
      setKayitlar(prev => prev.map(k => k.id === optimistik.id ? data : k))
    }
  }

  async function taksitGeriAl(k: TahsilatKaydi) {
    setKayitlar(prev => prev.filter(x => x.id !== k.id))
    const { error } = await supabase.from('tahsilat_kayitlari').delete().eq('id', k.id)
    if (error) { bilgi('❌ Geri alınamadı: ' + error.message, 4000); if (seciliKategori) loadKayitlar(seciliKategori.id) }
  }

  // ── Hızlı işaretle (boş hücre → ödendi) ──
  async function hizliOdedi(o: Ogrenci, d: Donem) {
    if (!okulId || !seciliKategori) return
    const ogrenciId = o.id
    const donem = d.key
    const tutar = ucretBul(seciliKategori, o)
    const optimistik: TahsilatKaydi = { id: geciciId(), kategori_id: seciliKategori.id, ogrenci_id: ogrenciId, donem, tutar, tarih: bugunISO() }
    setKayitlar(prev => [...prev, optimistik])
    const { data, error } = await supabase.from('tahsilat_kayitlari')
      .insert({ kategori_id: seciliKategori.id, ogrenci_id: ogrenciId, donem, tutar, tarih: bugunISO(), okul_id: okulId })
      .select('*').single()
    if (error) {
      setKayitlar(prev => prev.filter(k => k.id !== optimistik.id))
      bilgi('❌ İşaretlenemedi: ' + error.message, 4000)
    } else if (data) {
      setKayitlar(prev => prev.map(k => k.id === optimistik.id ? data : k))
    }
  }

  // ── Dolu hücre → popover ──
  function popoverAc(e: React.MouseEvent, ogrenciId: number, donem: string, mevcut: TahsilatKaydi) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPTutar(sayiYaz(mevcut.tutar))
    setPTarih(mevcut.tarih || bugunISO())
    setPAciklama(mevcut.aciklama || '')
    setPopover({ ogrenciId, donem, rect, mevcut })
  }

  async function popoverKaydet() {
    if (!popover?.mevcut) return
    if (pTutar.trim() && sayiCoz(pTutar) == null) { bilgi('❌ Tutar anlaşılamadı. Örnek: 1500 veya 1.500,50', 4000); return }
    const payload = {
      tutar: sayiCoz(pTutar),
      tarih: pTarih || null,
      aciklama: pAciklama || null,
    }
    const { error } = await supabase.from('tahsilat_kayitlari').update(payload).eq('id', popover.mevcut.id)
    if (error) { bilgi('❌ Güncellenemedi: ' + error.message, 4000); return }
    setKayitlar(prev => prev.map(k => k.id === popover.mevcut!.id ? { ...k, ...payload } : k))
    setPopover(null)
  }

  async function popoverSil() {
    if (!popover?.mevcut) return
    const id = popover.mevcut.id
    setKayitlar(prev => prev.filter(k => k.id !== id))
    setPopover(null)
    const { error } = await supabase.from('tahsilat_kayitlari').delete().eq('id', id)
    if (error) { bilgi('❌ Kaldırılamadı: ' + error.message, 4000); loadKayitlar(popover.mevcut.kategori_id) }
  }

  // ── Kategori formu ──
  function yeniAc() { setEditId(null); setForm(BOS_FORM); setSeciliOgrenci(new Set()); setOgrenciArama(''); setModalAcik(true) }
  function duzenleAc(k: TahsilatKategori) {
    setEditId(k.id)
    setForm({ ad: k.ad, tip: k.tip, veri_kaynagi: k.veri_kaynagi, kapsam: k.kapsam, varsayilan_tutar: sayiYaz(k.varsayilan_tutar), varsayilan_tutar_okul: sayiYaz(k.varsayilan_tutar_okul) })
    setSeciliOgrenci(new Set(uyelikler.filter(u => u.kategori_id === k.id).map(u => u.ogrenci_id)))
    setOgrenciArama(''); setModalAcik(true)
  }
  function kaynakDegistir(v: TahsilatVeriKaynagi) {
    if (v === 'otomatik_kulup') setForm(f => ({ ...f, veri_kaynagi: v, tip: 'aylik', kapsam: 'tumu', varsayilan_tutar: '', varsayilan_tutar_okul: '' }))
    else setForm(f => ({ ...f, veri_kaynagi: v }))
  }

  async function kaydet() {
    if (!form.ad.trim()) { bilgi('❌ Kategori adı zorunlu.'); return }
    if ([form.varsayilan_tutar, form.varsayilan_tutar_okul].some(t => t.trim() && sayiCoz(t) == null)) { bilgi('❌ Ücret anlaşılamadı. Örnek: 1500 veya 1.500,50'); return }
    if (!okulId) { bilgi('❌ Oturum bilgisi eksik, sayfayı yenileyin.'); return }
    if (form.veri_kaynagi === 'otomatik_kulup') {
      const varOlan = kategoriler.find(k => k.veri_kaynagi === 'otomatik_kulup' && k.id !== editId)
      if (varOlan) { bilgi(`❌ Zaten bir otomatik Kulüp kategorisi var: "${varOlan.ad}".`); return }
    }
    setSaving(true)
    const payload = {
      ad: form.ad.trim(), tip: form.tip, veri_kaynagi: form.veri_kaynagi,
      kapsam: form.veri_kaynagi === 'otomatik_kulup' ? 'tumu' : form.kapsam,
      varsayilan_tutar: sayiCoz(form.varsayilan_tutar),
      varsayilan_tutar_okul: sayiCoz(form.varsayilan_tutar_okul),
      okul_id: okulId,
      birim,
    }
    try {
      let katId = editId
      if (editId) {
        const { error } = await supabase.from('tahsilat_kategorileri').update(payload).eq('id', editId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('tahsilat_kategorileri').insert(payload).select('id').single()
        if (error) throw error
        katId = data.id
      }
      if (katId) {
        await supabase.from('tahsilat_kategori_ogrenci').delete().eq('kategori_id', katId)
        if (payload.kapsam === 'secili' && seciliOgrenci.size > 0) {
          const rows = Array.from(seciliOgrenci).map(oid => ({ kategori_id: katId, ogrenci_id: oid, okul_id: okulId }))
          const { error: uErr } = await supabase.from('tahsilat_kategori_ogrenci').insert(rows)
          if (uErr) throw uErr
        }
      }
      setModalAcik(false)
      bilgi(editId ? '✅ Kategori güncellendi.' : '✅ Kategori eklendi.')
      if (!editId && katId) setSeciliKategoriId(katId)
      load()
    } catch (err) {
      bilgi('❌ Kayıt hatası: ' + (hataMesaji(err, 'Bilinmiyor')), 5000)
    } finally { setSaving(false) }
  }

  async function silOnayla() {
    if (!conf) return
    const { id } = conf
    setConf(null)
    const { error } = await supabase.from('tahsilat_kategorileri').delete().eq('id', id)
    if (error) { bilgi('❌ Silme hatası: ' + error.message, 5000); return }
    if (seciliKategoriId === id) setSeciliKategoriId(null)
    if (rKategoriId === id) setRKategoriId(null)
    bilgi('✅ Kategori silindi.')
    load()
  }

  const filtreliOgrenciler = useMemo(() => {
    const q = ogrenciArama.toLocaleLowerCase('tr').trim()
    if (!q) return ogrenciler
    return ogrenciler.filter(o => `${o.ad} ${o.soyad}`.toLocaleLowerCase('tr').includes(q) || (o.sinif || '').toLocaleLowerCase('tr').includes(q))
  }, [ogrenciler, ogrenciArama])
  function toggleOgrenci(id: number) { setSeciliOgrenci(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n }) }
  const otomatikKilit = form.veri_kaynagi === 'otomatik_kulup'

  // Izgara özeti — Kulüp/Okul filtresindeki öğrenciler (aramadan bağımsız)
  const ozet = useMemo(() => {
    const donemSet = new Set(donemler.map(d => d.key))
    const turMap = new Map(uyeOgrenciler.map(o => [o.id, kulupOgrencisi(o)]))
    let kulupTutar = 0, okulTutar = 0
    kayitlar.forEach(k => {
      if (!donemSet.has(anaDonem(k.donem)) || !turMap.has(k.ogrenci_id)) return
      const t = Number(k.tutar) || 0
      if (turMap.get(k.ogrenci_id)) kulupTutar += t; else okulTutar += t
    })
    // Beklenen ve kalan yalnız bugüne kadar gelmiş dönemler / vadesi gelmiş taksitler üzerinden,
    // kalan öğrenci × dönem bazında (birinin fazla ödemesi diğerinin borcunu kapatmaz)
    let beklenen = 0, kalan = 0, geciken = 0, planli = 0
    let ucretTanimli = false
    const gecikenOgrenci = new Set<number>()
    if (seciliKategori && !saltOkunur) {
      uyeOgrenciler.forEach(o => donemler.forEach(d => {
        const plan = planMap.get(`${o.id}|${d.key}`)
        if (plan) {
          ucretTanimli = true; planli++
          const pd = planDurumu(plan, key => kayitMap.get(`${o.id}|${key}`), bugun)
          pd.taksitler.forEach(t => {
            if (t.vade > bugun) return
            beklenen += t.tutar
            if (!t.kayit) kalan += t.tutar
          })
          if (pd.geciken) { geciken += pd.geciken; gecikenOgrenci.add(o.id) }
        } else {
          const u = ucretBul(seciliKategori, o)
          if (u == null) return
          ucretTanimli = true
          if (!donemGeldi(d.key, bugun)) return
          beklenen += u
          const kayit = kayitMap.get(`${o.id}|${d.key}`)
          // tutarı boş bırakılmış kayıt "ödendi" sayılır (ızgarada da öyle görünür)
          const odenen = kayit ? (kayit.tutar != null ? Number(kayit.tutar) : u) : 0
          kalan += Math.max(0, u - odenen)
        }
      }))
    }
    const kulupSayi = uyeOgrenciler.filter(kulupOgrencisi).length
    const toplamTutar = kulupTutar + okulTutar
    return { kulupTutar, okulTutar, toplamTutar, kulupSayi, okulSayi: uyeOgrenciler.length - kulupSayi, beklenen, kalan, ucretTanimli, geciken, gecikenOgrenci: gecikenOgrenci.size, planli }
  }, [kayitlar, donemler, uyeOgrenciler, seciliKategori, saltOkunur, kayitMap, planMap, bugun])


  const rKategori = useMemo(() => kategoriler.find(k => k.id === rKategoriId) || null, [kategoriler, rKategoriId])
  const rDonemler = useMemo(() => hesaplaDonemler(rKategori, egitimYili), [rKategori, egitimYili])

  const siniflar = useMemo(() => Array.from(new Set(ogrenciler.map(o => o.sinif).filter(Boolean))).sort() as string[], [ogrenciler])

  // Rapor kategorisi seçilince ilk kategori + geçerli dönem ata
  useDegisince([view, kategoriler, rKategoriId], () => {
    if (view === 'rapor' && rKategoriId == null && kategoriler.length) setRKategoriId(kategoriler[0].id)
  })
  useDegisince([rDonemler, rDonem], () => {
    if (rDonemler.length && !rDonemler.some(d => d.key === rDonem)) setRDonem(rDonemler[0].key)
  })

  // Seçili kategori+dönem için ödeyenleri çek
  useEffect(() => {
    if (view !== 'rapor' || !rKategori || !rDonem) { queueMicrotask(() => { setRKayitlar([]); setRPlanlar([]) }); return }
    let iptal = false
    ;(async () => {
      setRLoading(true)
      let kay: TahsilatKaydi[] = []
      let pl: TahsilatTaksitPlani[] = []
      if (rKategori.veri_kaynagi === 'otomatik_kulup') {
        const [yStr, mStr] = rDonem.split('-')
        const { data } = await supabase.from('tahsilat').select('id, ogrenci_id, tutar').eq('yil', Number(yStr)).eq('ay', Number(mStr))
        kay = (data || []).map(t => ({ id: t.id, kategori_id: rKategori.id, ogrenci_id: t.ogrenci_id, donem: rDonem, tutar: t.tutar }))
      } else {
        const [{ data: pesin }, { data: taksit }, { data: plan }] = await Promise.all([
          supabase.from('tahsilat_kayitlari').select('*').eq('kategori_id', rKategori.id).eq('donem', rDonem),
          supabase.from('tahsilat_kayitlari').select('*').eq('kategori_id', rKategori.id).like('donem', `${rDonem}/T%`),
          supabase.from('tahsilat_taksit_planlari').select('*').eq('kategori_id', rKategori.id).eq('donem', rDonem),
        ])
        kay = [...(pesin || []), ...(taksit || [])]
        pl = plan || []
      }
      if (!iptal) { setRKayitlar(kay); setRPlanlar(pl); setRLoading(false) }
    })()
    return () => { iptal = true }
  }, [view, rKategori, rDonem])

  const rUyeler = useMemo<Ogrenci[]>(() => {
    if (!rKategori) return []
    let list = kapsamOgrencileri(rKategori, ogrenciler, uyelikler).filter(o => turUygun(o, turFiltre))
    if (rSinif) list = list.filter(o => o.sinif === rSinif)
    return list
  }, [rKategori, ogrenciler, uyelikler, rSinif, turFiltre])

  type RDurumu = 'odedi' | 'kismi' | 'odemedi'
  const rPlanVar = rPlanlar.length > 0
  const rSatirlar = useMemo(() => {
    const kMap = new Map<string, TahsilatKaydi>()
    rKayitlar.forEach(k => { if (!kMap.has(`${k.ogrenci_id}|${k.donem}`)) kMap.set(`${k.ogrenci_id}|${k.donem}`, k) })
    // otomatik (aidat) aynı ay birden çok tahsilat olabilir → tutarı topla
    const aidatToplam = new Map<number, number>()
    rKayitlar.forEach(k => aidatToplam.set(k.ogrenci_id, (aidatToplam.get(k.ogrenci_id) || 0) + (Number(k.tutar) || 0)))
    const pMap = new Map(rPlanlar.map(p => [p.ogrenci_id, p]))
    return rUyeler.map(o => {
      const plan = pMap.get(o.id)
      if (plan) {
        const pd = planDurumu(plan, key => kMap.get(`${o.id}|${key}`), bugun)
        const durum: RDurumu = pd.odenenAdet >= pd.adet ? 'odedi' : pd.odenenAdet > 0 ? 'kismi' : 'odemedi'
        return { o, odedi: durum === 'odedi', durum, sekil: `${pd.odenenAdet}/${pd.adet} taksit`, odenenTutar: pd.odenenTutar, kalan: Math.max(0, pd.toplam - pd.odenenTutar), geciken: pd.geciken, sonrakiVade: pd.sonrakiVade }
      }
      const kayit = kMap.get(`${o.id}|${rDonem}`)
      const ucret = rKategori ? ucretBul(rKategori, o) : null
      const odenenTutar = kayit ? (rKategori?.veri_kaynagi === 'otomatik_kulup' ? aidatToplam.get(o.id) || 0 : Number(kayit.tutar) || 0) : 0
      const durum: RDurumu = kayit ? 'odedi' : 'odemedi'
      return { o, odedi: !!kayit, durum, sekil: 'Peşin', odenenTutar, kalan: kayit ? 0 : ucret, geciken: 0, sonrakiVade: null as string | null }
    })
  }, [rUyeler, rKayitlar, rPlanlar, rKategori, rDonem, bugun])

  const borclular = useMemo(() => rSatirlar.filter(x => !x.odedi), [rSatirlar])
  const rOdeyenSayisi = rSatirlar.length - borclular.length
  const rKismiSayisi = rSatirlar.filter(x => x.durum === 'kismi').length
  const rGecikenSayisi = rSatirlar.filter(x => x.geciken > 0).length

  // Duruma göre filtre; önce ödemeyenler, sonra kısmi, sonra ödeyenler
  const DURUM_SIRA: Record<RDurumu, number> = { odemedi: 0, kismi: 1, odedi: 2 }
  const rListe = useMemo(() => {
    let f = rSatirlar
    if (rDurum === 'odeyen') f = f.filter(x => x.odedi)
    else if (rDurum === 'odemeyen') f = f.filter(x => !x.odedi)
    else if (rDurum === 'geciken') f = f.filter(x => x.geciken > 0)
    return [...f].sort((a, b) => (DURUM_SIRA[a.durum] - DURUM_SIRA[b.durum]) || `${a.o.ad} ${a.o.soyad}`.localeCompare(`${b.o.ad} ${b.o.soyad}`, 'tr'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rSatirlar, rDurum])
  // Ekranda aramaya göre süzülmüş liste (PDF aramadan bağımsız, tüm listeyi basar)
  const rGorunen = useMemo(() => rListe.filter(x => aramaUygun(x.o, rArama)), [rListe, rArama])

  async function raporPdf() {
    if (!rKategori) return
    if (rListe.length === 0) { setPdfMsg('⚠️ Bu filtrede öğrenci yok.'); setTimeout(() => setPdfMsg(''), 3000); return }
    setPdfMsg('⌛ PDF hazırlanıyor...')
    try {
      const { pdf, autoTable } = await pdfHazirla('portrait')
      const PW = pdf.internal.pageSize.getWidth()
      const donemLabel = rDonemler.find(d => d.key === rDonem)?.label || rDonem
      const baslikEk = rDurum === 'odeyen' ? 'Ödeyenler' : rDurum === 'odemeyen' ? 'Ödemeyenler' : rDurum === 'geciken' ? 'Vadesi geçenler' : 'Ödeme durumu'
      const turEk = turFiltre === 'kulup' ? ' · Kulüp öğrencileri' : turFiltre === 'okul' ? ' · Okul öğrencileri' : ''
      let startY = pdfBaslik(pdf, { kurum: birimKurumAdi(birim, ayarlar, okul?.ad), baslik: `${rKategori.ad} · ${baslikEk} listesi`, alt: `Dönem: ${donemLabel}${rSinif ? ' · Sınıf: ' + rSinif : ''}${turEk}` })
      const ozetMetin = `Ödeyen: ${rOdeyenSayisi}  ·  ${rPlanVar ? `Kısmi: ${rKismiSayisi}  ·  ` : ''}Ödemeyen: ${borclular.length - rKismiSayisi}  ·  Toplam: ${rUyeler.length}`
      pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...PDF_RENK.ikincil)
      pdf.text(ozetMetin, PW / 2, startY, { align: 'center' })
      pdf.setTextColor(...PDF_RENK.metin)
      startY += 3

      const durumYazi = (d: RDurumu) => d === 'odedi' ? 'ÖDEDİ' : d === 'kismi' ? 'KISMİ' : 'ÖDEMEDİ'
      const body = rListe.map((x, i) => [
        i + 1,
        x.o.tc || '-',
        `${x.o.ad} ${x.o.soyad}`,
        x.o.sinif || '-',
        x.o.ogretmen || '-',
        kulupOgrencisi(x.o) ? 'Kulüp' : 'Okul',
        ...(rPlanVar ? [x.sekil, fmtTL(x.odenenTutar), x.kalan != null ? fmtTL(x.kalan) : '-'] : []),
        durumYazi(x.durum) + (x.geciken > 0 ? `\n(${x.geciken} gecikmiş)` : ''),
      ])
      const durumKol = rPlanVar ? 9 : 6
      autoTable(pdf, pdfTablo({
        head: [['Sıra', 'Kimlik No', 'Öğrenci adı soyadı', 'Sınıfı', 'Öğretmeni', 'Türü', ...(rPlanVar ? ['Ödeme', 'Ödenen', 'Kalan'] : []), 'Durum']],
        body, startY,
        styles: { fontSize: rPlanVar ? 7.5 : 8.5, cellPadding: rPlanVar ? 1.4 : 1.8, halign: 'center' },
        columnStyles: rPlanVar
          ? { 0: { cellWidth: 9 }, 1: { cellWidth: 22 }, 2: { halign: 'left' }, 3: { cellWidth: 12 }, 5: { cellWidth: 12 }, 6: { cellWidth: 17 }, 7: { cellWidth: 18, halign: 'right' }, 8: { cellWidth: 18, halign: 'right' }, 9: { cellWidth: 20, fontStyle: 'bold' } }
          : { 0: { cellWidth: 12 }, 1: { cellWidth: 28 }, 2: { halign: 'left' }, 3: { cellWidth: 16 }, 5: { cellWidth: 16 }, 6: { cellWidth: 22, fontStyle: 'bold' } },
        didParseCell: (d: CellHookData) => {
          if (d.section === 'body' && d.column.index === durumKol) {
            const raw = String(d.cell.raw)
            d.cell.styles.textColor = raw.startsWith('ÖDEDİ') ? [11, 107, 66] : raw.startsWith('KISMİ') ? [138, 82, 0] : PDF_RENK.hata
          }
        },
      }))
      pdfAc(pdf, `${rKategori.ad} tahsilat listesi`)
      setPdfMsg('✅ PDF hazırlandı.')
    } catch (err) {
      setPdfMsg('❌ PDF hatası: ' + (hataMesaji(err, 'Bilinmiyor')))
    } finally { setTimeout(() => setPdfMsg(''), 4000) }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Topbar
        title={birim === 'oab' ? 'OAB Tahsilat Takip' : birim === 'kulup' ? 'Kulüp Tahsilat Takip' : 'Tahsilat Takip'}
        sub={`${ayLabel(ay, yil)} — ${view === 'takip' ? 'Ödeme Takibi' : view === 'rapor' ? 'Ödeme Durumu' : 'Kategori Yönetimi'}`}
        actions={
          <div className="tk-seg">
            <button className={view === 'takip' ? 'on' : ''} onClick={() => setView('takip')}><Grid3x3 size={14} /> Takip</button>
            <button className={view === 'rapor' ? 'on' : ''} onClick={() => setView('rapor')}><FileWarning size={14} /> Ödeme Durumu</button>
            <button className={view === 'yonetim' ? 'on' : ''} onClick={() => setView('yonetim')}><FolderCog size={14} /> Kategoriler</button>
          </div>
        }
      />

      <div style={{ padding: 28 }}>
        {msg && (
          <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : msg.startsWith('❌') ? 'alert-danger' : 'alert-info'}`} style={{ marginBottom: 16 }}>{msg}</div>
        )}

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>Yükleniyor...</div>
        ) : kategoriler.length === 0 ? (
          <div style={emptyBox}>
            <ClipboardList size={48} color="var(--accent)" style={{ marginBottom: 18 }} />
            <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 8px' }}>Henüz kategori yok</h2>
            <p style={{ color: 'var(--text2)', maxWidth: 440, marginBottom: 22, lineHeight: 1.6 }}>{birim === 'oab' ? 'Okul aile birliği bağışı, aidatı veya bir etkinlik için ilk tahsilat kategorinizi oluşturun.' : birim === 'kulup' ? 'Kırtasiye, gezi, etkinlik veya forma gibi aidat dışı kulüp tahsilatları için ilk kategorinizi oluşturun. Aylık aidat Ödeme Takibi’nde kalır.' : 'Okul, kulüp, kırtasiye veya bir etkinlik için ilk tahsilat kategorinizi oluşturun.'}</p>
            <button className="btn btn-primary" onClick={yeniAc}><Plus size={16} /> İlk Kategoriyi Oluştur</button>
          </div>
        ) : view === 'yonetim' ? (
          /* ───────── KATEGORİ YÖNETİMİ ───────── */
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={yeniAc} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={15} /> Yeni Kategori</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {kategoriler.map(k => {
                const otomatik = k.veri_kaynagi === 'otomatik_kulup'
                const renk = otomatik ? 'var(--info)' : 'var(--accent)'
                return (
                  <div key={k.id} className="card tk-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
                    <div style={{ height: 4, background: renk }} />
                    <div style={{ padding: '16px 18px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="tk-iconchip" style={{ background: otomatik ? 'var(--info-light)' : 'var(--accent-lighter)', color: renk }}>
                          {otomatik ? <RefreshCw size={18} /> : TIP_ICON[k.tip]}
                        </div>
                        <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: 'var(--text)', wordBreak: 'break-word', lineHeight: 1.2 }}>{k.ad}</h3>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                        <span style={badge}>{TIP_ICON[k.tip]} {TIP_LABELS[k.tip]}</span>
                        {otomatik
                          ? <span style={{ ...badge, background: 'var(--info-light)', color: '#1a5b8a', borderColor: 'var(--info-border)' }}><RefreshCw size={11} /> Otomatik</span>
                          : <span style={badge}><Users size={11} /> Manuel</span>}
                      </div>
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border-light)', fontSize: 12.5, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {(() => {
                          const say = ogrenciSayisi(k)
                          return (
                            <div>
                              <Users size={12} style={{ verticalAlign: -2, marginRight: 6, opacity: 0.55 }} />
                              {otomatik ? 'Kulüp öğrencileri' : k.kapsam === 'tumu' ? 'Tüm öğrenciler' : 'Seçili öğrenciler'} — <strong style={{ color: 'var(--text)' }}>{say.toplam}</strong> kişi
                              {!otomatik && say.okul > 0 && <span style={{ color: 'var(--text3)' }}> ({say.kulup} kulüp · {say.okul} okul)</span>}
                            </div>
                          )
                        })()}
                        {!otomatik && (k.varsayilan_tutar != null || k.varsayilan_tutar_okul != null) && (
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <span><TurRozet okul={false} /> {k.varsayilan_tutar != null ? <strong style={{ color: 'var(--text)' }}>{fmtTL(Number(k.varsayilan_tutar))}</strong> : '—'}</span>
                            <span><TurRozet okul /> <strong style={{ color: 'var(--text)' }}>{fmtTL(Number(k.varsayilan_tutar_okul ?? k.varsayilan_tutar ?? 0))}</strong></span>
                          </div>
                        )}
                        {taksitAcilabilir(k) && (
                          <div><Layers size={12} style={{ verticalAlign: -2, marginRight: 6, opacity: 0.55 }} />Öğrenci bazlı taksit açılabilir</div>
                        )}
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', display: 'flex' }}>
                      <button className="tk-cardbtn" onClick={() => duzenleAc(k)}><Pencil size={13} /> Düzenle</button>
                      <div style={{ width: 1, background: 'var(--border)' }} />
                      <button className="tk-cardbtn danger" onClick={() => setConf({ id: k.id, ad: k.ad })}><Trash2 size={13} /> Sil</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : view === 'rapor' ? (
          /* ───────── ÖDEMEYENLER RAPORU ───────── */
          <>
            <div className="card" style={{ padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ minWidth: 180 }}>
                <label className="form-label">Kategori</label>
                <select className="form-select" value={rKategoriId ?? ''} onChange={e => setRKategoriId(Number(e.target.value))}>
                  {kategoriler.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 150 }}>
                <label className="form-label">Dönem</label>
                <select className="form-select" value={rDonem} onChange={e => setRDonem(e.target.value)}>
                  {rDonemler.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 140 }}>
                <label className="form-label">Sınıf</label>
                <select className="form-select" value={rSinif} onChange={e => setRSinif(e.target.value)}>
                  <option value="">Tüm Sınıflar</option>
                  {siniflar.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 140 }}>
                <label className="form-label">Öğrenci Türü</label>
                <select className="form-select" value={turFiltre} onChange={e => setTurFiltre(e.target.value as TurFiltre)}>
                  <option value="hepsi">Tümü</option>
                  <option value="kulup">Kulüp öğrencileri</option>
                  <option value="okul">Okul öğrencileri</option>
                </select>
              </div>
              <div style={{ minWidth: 140 }}>
                <label className="form-label">Durum</label>
                <select className="form-select" value={rDurum} onChange={e => setRDurum(e.target.value as typeof rDurum)}>
                  <option value="hepsi">Tümü</option>
                  <option value="odeyen">{rPlanVar ? 'Tamamını ödeyenler' : 'Ödeyenler'}</option>
                  <option value="odemeyen">{rPlanVar ? 'Borcu kalanlar' : 'Ödemeyenler'}</option>
                  {rPlanVar && <option value="geciken">Vadesi geçenler</option>}
                </select>
              </div>
              <button className="btn btn-pdf btn-sm" onClick={raporPdf} style={{ marginLeft: 'auto' }}>
                <Download size={14} /> PDF İndir
              </button>
            </div>

            {pdfMsg && <div className={`alert ${pdfMsg.startsWith('✅') ? 'alert-success' : pdfMsg.startsWith('⚠️') ? 'alert-warn' : pdfMsg.startsWith('❌') ? 'alert-danger' : 'alert-info'}`} style={{ marginBottom: 16 }}>{pdfMsg}</div>}

            {!rKategori ? (
              <div style={emptyBox}><p style={{ color: 'var(--text2)' }}>Rapor için bir kategori seçin.</p></div>
            ) : (
              <>
                {rPlanVar && (
                  <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Layers size={16} style={{ flexShrink: 0 }} />
                    <span>Bu dönemde <strong>{rPlanlar.length}</strong> öğrenci taksitle ödüyor. Taksitli öğrencilerde durum, ödenen taksit sayısına göre hesaplanır.</span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rPlanVar ? 4 : 3},1fr)`, gap: 12, marginBottom: 16 }}>
                  <div className="card" style={statBox}><div style={statLabel}>Kapsam</div><div style={statVal}>{rUyeler.length}</div></div>
                  <div className="card" style={statBox}><div style={statLabel}>{rPlanVar ? 'Tamamını Ödeyen' : 'Ödeyen'}</div><div style={{ ...statVal, color: 'var(--success)' }}>{rOdeyenSayisi}</div></div>
                  <div className="card" style={statBox}>
                    <div style={statLabel}>{rPlanVar ? 'Borcu Kalan' : 'Borçlu'}</div><div style={{ ...statVal, color: 'var(--danger)' }}>{borclular.length}</div>
                    {rPlanVar && rKismiSayisi > 0 && <div style={statAlt}>{rKismiSayisi} kısmi ödemeli</div>}
                  </div>
                  {rPlanVar && <div className="card" style={statBox}><div style={statLabel}>Vadesi Geçen</div><div style={{ ...statVal, color: rGecikenSayisi ? 'var(--danger)' : 'var(--text3)' }}>{rGecikenSayisi}</div><div style={statAlt}>öğrencinin gecikmiş taksiti var</div></div>}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <AramaKutusu value={rArama} onChange={setRArama} sonuc={`${rGorunen.length} / ${rListe.length} öğrenci`} />
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 50 }}>Sıra</th><th style={{ width: 130 }}>Kimlik No</th><th>Öğrenci Adı Soyadı</th><th style={{ width: 90 }}>Sınıfı</th><th>Öğretmeni</th><th style={{ width: 80, textAlign: 'center' }}>Türü</th>
                          {rPlanVar && <><th style={{ width: 110, textAlign: 'center' }}>Ödeme</th><th style={{ width: 100, textAlign: 'right' }}>Ödenen</th><th style={{ width: 100, textAlign: 'right' }}>Kalan</th></>}
                          <th style={{ width: 120, textAlign: 'center' }}>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rLoading ? (
                          <tr><td colSpan={rPlanVar ? 10 : 7} style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>Yükleniyor...</td></tr>
                        ) : rGorunen.length === 0 ? (
                          <tr><td colSpan={rPlanVar ? 10 : 7} style={{ padding: 28, textAlign: 'center', color: 'var(--text3)' }}>{rArama.trim() && rListe.length ? `"${rArama.trim()}" ile eşleşen öğrenci yok.` : 'Bu filtrede öğrenci yok.'}</td></tr>
                        ) : rGorunen.map((x, i) => (
                          <tr key={x.o.id}>
                            <td style={{ textAlign: 'center', color: 'var(--text3)' }}>{i + 1}</td>
                            <td style={{ fontSize: 12 }}>{x.o.tc || '-'}</td>
                            <td><strong>{x.o.ad} {x.o.soyad}</strong></td>
                            <td>{x.o.sinif || '-'}</td>
                            <td>{x.o.ogretmen || '-'}</td>
                            <td style={{ textAlign: 'center' }}><TurRozet okul={!kulupOgrencisi(x.o)} uzun /></td>
                            {rPlanVar && <>
                              <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 12 }}>
                                {x.sekil}
                                {x.sonrakiVade && <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--text3)' }}>Sonraki: {fmtVade(x.sonrakiVade)}</div>}
                              </td>
                              <td style={{ textAlign: 'right' }}>{fmtTL(x.odenenTutar)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: x.kalan ? 'var(--danger)' : 'var(--text3)' }}>{x.kalan != null ? fmtTL(x.kalan) : '-'}</td>
                            </>}
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${x.durum === 'odedi' ? 'badge-green' : x.durum === 'kismi' ? 'badge-orange' : 'badge-red'}`}>{x.durum === 'odedi' ? 'Ödedi' : x.durum === 'kismi' ? 'Kısmi' : 'Ödemedi'}</span>
                              {x.geciken > 0 && <div style={{ fontSize: 10.5, color: 'var(--danger)', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}><AlertTriangle size={10} /> {x.geciken} taksit gecikti</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          /* ───────── TAKİP IZGARASI ───────── */
          <>
            {/* Kategori seçici */}
            <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', marginBottom: 11, textTransform: 'uppercase', letterSpacing: 0.7 }}>Kategori</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {kategoriler.map(k => (
                  <button key={k.id} onClick={() => setSeciliKategoriId(k.id)} className={`tk-chip ${seciliKategoriId === k.id ? 'on' : ''}`}>
                    {k.veri_kaynagi === 'otomatik_kulup' ? <RefreshCw size={13} /> : TIP_ICON[k.tip]} {k.ad}
                  </button>
                ))}
                {seciliKategori && !saltOkunur && (
                  <div className="tk-seg" style={{ marginLeft: 'auto' }}>
                    {([['hepsi', 'Tümü'], ['kulup', 'Kulüp'], ['okul', 'Okul']] as [TurFiltre, string][]).map(([v, l]) => (
                      <button key={v} className={turFiltre === v ? 'on' : ''} onClick={() => setTurFiltre(v)}>{l}</button>
                    ))}
                  </div>
                )}
                {seciliKategori && seciliKategori.tip !== 'tek_seferlik' && (
                  <div style={{ marginLeft: saltOkunur ? 'auto' : 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--text3)', fontWeight: 600 }}>Eğitim Yılı</span>
                    <select className="form-select" style={{ width: 130 }} value={egitimYili} onChange={e => setEgitimYili(Number(e.target.value))}>
                      {[varsayilanEgitimYili - 1, varsayilanEgitimYili, varsayilanEgitimYili + 1].map(y => (
                        <option key={y} value={y}>{y}-{y + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {!seciliKategori ? (
              <div style={emptyBox}><p style={{ color: 'var(--text2)' }}>Takip için bir kategori seçin.</p></div>
            ) : uyeOgrenciler.length === 0 ? (
              <div style={emptyBox}><p style={{ color: 'var(--text2)' }}>{
                kapsamTum.length > 0 ? `Bu kategoride ${turFiltre === 'okul' ? 'okul' : 'kulüp'} öğrencisi yok.`
                  : saltOkunur ? 'Sistemde öğrenci kaydı bulunamadı.'
                  : 'Bu kategoriye atanmış öğrenci yok. "Kategoriler" sekmesinden öğrenci ekleyin.'
              }</p></div>
            ) : (
              <>
                {saltOkunur && (
                  <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RefreshCw size={16} style={{ flexShrink: 0 }} />
                    <span><strong>Salt-okunur:</strong> Kulüp aidatı ödemeleri mevcut <strong>Ödeme Takibi</strong> ekranından gelir; buradan değiştirilemez. Yeşil hücre = o ay aidat tahsil edilmiş.</span>
                  </div>
                )}
                {/* Özet */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${saltOkunur || !ozet.ucretTanimli ? 2 : 4},1fr)`, gap: 12, marginBottom: 16 }}>
                  <div className="card" style={statBox}>
                    <div style={statLabel}>Öğrenci</div>
                    <div style={statVal}>{uyeOgrenciler.length}</div>
                    {!saltOkunur && turFiltre === 'hepsi' && <div style={statAlt}><TurRozet okul={false} /> {ozet.kulupSayi} &nbsp;·&nbsp; <TurRozet okul /> {ozet.okulSayi}</div>}
                    {!saltOkunur && turFiltre !== 'hepsi' && <div style={statAlt}>Yalnız {turFiltre === 'kulup' ? 'kulüp' : 'okul'} öğrencileri</div>}
                  </div>
                  <div className="card" style={statBox}>
                    <div style={statLabel}>Toplanan Tutar</div>
                    <div style={statVal}>{fmtTL(ozet.toplamTutar)}</div>
                    {!saltOkunur && <div style={statAlt}><TurRozet okul={false} /> {fmtTL(ozet.kulupTutar)} &nbsp;·&nbsp; <TurRozet okul /> {fmtTL(ozet.okulTutar)}</div>}
                  </div>
                  {!saltOkunur && ozet.ucretTanimli && <>
                    <div className="card" style={statBox}>
                      <div style={statLabel}>Beklenen Tutar</div>
                      <div style={statVal}>{fmtTL(ozet.beklenen)}</div>
                      <div style={statAlt}>{ozet.beklenen > 0
                        ? <>Bugüne kadar · %{Math.round(((ozet.beklenen - ozet.kalan) / ozet.beklenen) * 100)} tahsil edildi</>
                        : 'Henüz vadesi gelen dönem yok'}</div>
                    </div>
                    <div className="card" style={statBox}>
                      <div style={statLabel}>Kalan Borç</div>
                      <div style={{ ...statVal, color: ozet.kalan ? 'var(--danger)' : 'var(--success)' }}>{fmtTL(ozet.kalan)}</div>
                      {ozet.geciken > 0 && <div style={{ ...statAlt, color: 'var(--danger)' }}><AlertTriangle size={12} /> {ozet.geciken} taksit vadesi geçti ({ozet.gecikenOgrenci} öğrenci)</div>}
                      {!ozet.geciken && ozet.planli > 0 && <div style={statAlt}><Layers size={12} /> {ozet.planli} taksit planı</div>}
                    </div>
                  </>}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <AramaKutusu value={takipArama} onChange={setTakipArama} sonuc={`${gorunenOgrenciler.length} / ${uyeOgrenciler.length} öğrenci`} />
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
                    <table className="tk-grid" style={{ fontSize: 12, width: '100%', minWidth: donemler.length * 90 + 220 }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 6 }}>
                        <tr>
                          <th style={{ ...thStyle, position: 'sticky', left: 0, zIndex: 7, minWidth: 200, textAlign: 'left', paddingLeft: 16, boxShadow: '2px 0 5px rgba(0,0,0,0.08)' }}>Öğrenci</th>
                          {donemler.map(d => (
                            <th key={d.key} style={{ ...thStyle, minWidth: 90 }}>{d.kisa}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {kayitLoading ? (
                          <tr><td colSpan={donemler.length + 1} style={{ padding: 30, textAlign: 'center', color: 'var(--text3)' }}>Yükleniyor...</td></tr>
                        ) : gorunenOgrenciler.length === 0 ? (
                          <tr><td colSpan={donemler.length + 1} style={{ padding: 30, textAlign: 'center', color: 'var(--text3)' }}>&quot;{takipArama.trim()}&quot; ile eşleşen öğrenci yok.</td></tr>
                        ) : gorunenOgrenciler.map(o => (
                          <tr key={o.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td className="tk-namecell" style={{ ...tdStyle, position: 'sticky', left: 0, zIndex: 4, background: 'var(--surface)', textAlign: 'left', paddingLeft: 16, fontWeight: 600, boxShadow: '2px 0 5px rgba(0,0,0,0.05)', borderRight: '1px solid var(--border)' }}>
                              {!saltOkunur && <TurRozet okul={!kulupOgrencisi(o)} />} {o.ad} {o.soyad}
                              <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{o.sinif || ''}</span>
                            </td>
                            {donemler.map(d => {
                              const kayit = kayitBul(o.id, d.key)
                              const plan = saltOkunur ? undefined : planBul(o.id, d.key)
                              return (
                                <td key={d.key} style={{ ...tdStyle, padding: 3 }}>
                                  {saltOkunur ? (
                                    kayit
                                      ? <div className="tk-cell paid ro" title={kayit.tarih || ''}><Check size={13} />{kayit.tutar != null && <span style={{ fontSize: 10 }}>{fmtTL(Number(kayit.tutar))}</span>}</div>
                                      : <div className="tk-cell roempty">—</div>
                                  ) : plan ? (() => {
                                    const pd = planDurum(plan)
                                    const tamam = pd.odenenAdet >= pd.adet
                                    return (
                                      <button onClick={(e) => setTaksitPop({ o, d, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
                                        className={`tk-cell ${tamam ? 'paid' : 'partial'}${pd.geciken ? ' late' : ''}`}
                                        title={`${pd.adet} taksit · ${pd.odenenAdet} ödendi${pd.geciken ? ` · ${pd.geciken} vadesi geçti` : pd.sonrakiVade ? ` · sonraki vade ${fmtVade(pd.sonrakiVade)}` : ''}`}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>{pd.geciken ? <AlertTriangle size={12} /> : tamam ? <Check size={12} /> : <Layers size={12} />}{pd.odenenAdet}/{pd.adet}</span>
                                        <span style={{ fontSize: 10 }}>{fmtTL(pd.odenenTutar)}</span>
                                      </button>
                                    )
                                  })() : kayit ? (
                                    <button onClick={(e) => popoverAc(e, o.id, d.key, kayit)} className="tk-cell paid" title={kayit.tarih || ''}>
                                      <Check size={13} />
                                      {kayit.tutar != null && <span style={{ fontSize: 10 }}>{fmtTL(Number(kayit.tutar))}</span>}
                                    </button>
                                  ) : (
                                    <div className="tk-cellwrap">
                                      <button onClick={() => hizliOdedi(o, d)} className="tk-cell empty" title="Peşin ödendi olarak işaretle">+</button>
                                      {taksitAcilabilir(seciliKategori) && (
                                        <button className="tk-taksitbtn" title="Taksitlendir" onClick={() => planAc(o, d)}><Layers size={11} /></button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!saltOkunur && (
                    <div className="tk-legend">
                      <span><span className="dot" style={{ background: 'var(--success-light)', border: '1px solid var(--success-border)' }} />Ödendi</span>
                      <span><span className="dot" style={{ background: 'var(--surface2)', border: '1px dashed var(--border)' }} />Ödenmedi</span>
                      {taksitAcilabilir(seciliKategori) && <>
                        <span><span className="dot" style={{ background: '#fef0d9', border: '1px solid #f3d9a8' }} />Taksit devam ediyor</span>
                        <span><span className="dot" style={{ background: 'var(--surface2)', border: '1.5px solid var(--danger)' }} />Vadesi geçen taksit</span>
                      </>}
                      <span style={{ marginLeft: 'auto', opacity: 0.8 }}>Boş kutu → peşin işaretle{taksitAcilabilir(seciliKategori) ? <> · <Layers size={11} style={{ verticalAlign: -1 }} /> → taksitlendir</> : ''} · Dolu kutu → düzenle</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Hücre popover */}
      {popover && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} {...perdeKapat(() => setPopover(null))}>
          <div
            style={{ ...popKonum(popover.rect, 234, 340), background:'var(--surface)', borderRadius: 12, boxShadow: '0 16px 44px rgba(0,0,0,0.22)', padding: 16, width: 234, border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Ödeme Bilgisi</div>
            <label className="form-label">Tutar (₺)</label>
            <input className="form-input" type="text" inputMode="decimal" value={pTutar} onChange={e => setPTutar(e.target.value)} style={{ marginBottom: 8 }} />
            <label className="form-label">Tarih</label>
            <input className="form-input" type="date" value={pTarih} onChange={e => setPTarih(e.target.value)} style={{ marginBottom: 8 }} />
            <label className="form-label">Açıklama</label>
            <input className="form-input" value={pAciklama} onChange={e => setPAciklama(e.target.value)} placeholder="Opsiyonel" style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={popoverKaydet}>Kaydet</button>
              <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }} onClick={popoverSil}>Kaldır</button>
            </div>
          </div>
        </div>
      )}

      {/* Taksitli hücre → taksit listesi */}
      {taksitPop && (() => {
        const plan = planBul(taksitPop.o.id, taksitPop.d.key)
        if (!plan) return null
        const pd = planDurum(plan)
        const W = 330
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} {...perdeKapat(() => setTaksitPop(null))}>
            <div
              style={{ ...popKonum(taksitPop.rect, W, 150 + pd.adet * 46), background:'var(--surface)', borderRadius: 12, boxShadow: '0 16px 44px rgba(0,0,0,0.22)', padding: 16, width: W, border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Taksit Planı · {taksitPop.d.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{taksitPop.o.ad} {taksitPop.o.soyad}</div>
                </div>
                <button onClick={() => setTaksitPop(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pd.taksitler.map(t => (
                  <div key={t.no} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, border: `1px solid ${t.kayit ? 'var(--success-border)' : t.gecikti ? 'var(--danger-border)' : 'var(--border)'}`, background: t.kayit ? 'var(--success-light)' : t.gecikti ? 'var(--danger-light)' : 'var(--bg)' }}>
                    <div style={{ width: 22, fontWeight: 700, fontSize: 12, color: 'var(--text2)' }}>{t.no}.</div>
                    <div style={{ flex: 1, fontSize: 12 }}>
                      <div style={{ fontWeight: 600 }}>{fmtTL(t.tutar)}</div>
                      <div style={{ fontSize: 10.5, color: t.gecikti ? 'var(--danger)' : 'var(--text3)' }}>
                        Vade {fmtVade(t.vade)}{t.kayit ? ` · Ödendi ${fmtVade(t.kayit.tarih)}` : t.gecikti ? ' · Gecikti' : ''}
                      </div>
                    </div>
                    {t.kayit
                      ? <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => taksitGeriAl(t.kayit!)}>Geri al</button>
                      : <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => taksitOde(plan, t.no)}><Check size={12} /> Ödendi</button>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', margin: '10px 2px' }}>
                <span>Ödenen <strong style={{ color: 'var(--success)' }}>{fmtTL(pd.odenenTutar)}</strong></span>
                <span>Kalan <strong style={{ color: pd.toplam - pd.odenenTutar > 0 ? 'var(--danger)' : 'var(--text3)' }}>{fmtTL(Math.max(0, pd.toplam - pd.odenenTutar))}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => planAc(taksitPop.o, taksitPop.d)}><Pencil size={12} /> Planı Düzenle</button>
                <button className="btn btn-sm" disabled={pd.odenenAdet > 0} title={pd.odenenAdet > 0 ? 'Ödenmiş taksit varken plan silinemez; önce ödemeleri geri alın.' : 'Planı kaldır (öğrenci peşine döner)'}
                  style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger-border)', opacity: pd.odenenAdet > 0 ? 0.5 : 1 }}
                  onClick={() => setPlanSilOnay(plan)}><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Taksit planı oluştur / düzenle */}
      {planForm && <PlanModal f={planForm} setPlanForm={setPlanForm} planFormHesapla={planFormHesapla} seciliKategori={seciliKategori} planSaving={planSaving} planMsg={planMsg} planKaydet={planKaydet} />}

      {planSilOnay && (
        <ConfirmModal baslik="Taksit Planını Kaldır" mesaj="Bu öğrencinin taksit planı kaldırılacak ve öğrenci bu dönem için peşin ödemeye döner. Emin misiniz?" onayMetni="Evet, Kaldır" tehlikeli onOnayla={planSil} onIptal={() => setPlanSilOnay(null)} />
      )}

      {/* Kategori form modal */}
      {modalAcik && <KategoriModal birim={birim} editId={editId} form={form} setForm={setForm} otomatikKilit={otomatikKilit} kaynakDegistir={kaynakDegistir} ogrenciArama={ogrenciArama} setOgrenciArama={setOgrenciArama} filtreliOgrenciler={filtreliOgrenciler} seciliOgrenci={seciliOgrenci} setSeciliOgrenci={setSeciliOgrenci} toggleOgrenci={toggleOgrenci} saving={saving} setModalAcik={setModalAcik} kaydet={kaydet} />}

      {conf && (
        <ConfirmModal baslik="Kategoriyi Sil" mesaj={`"${conf.ad}" kategorisi ve bu kategoriye ait tüm tahsilat işaretleri kalıcı olarak silinecek. Emin misiniz?`} onayMetni="Evet, Sil" tehlikeli onOnayla={silOnayla} onIptal={() => setConf(null)} />
      )}

      <style jsx>{`
        /* Button refinements (page-scoped) */

        /* Segmented tab control */
        .tk-seg { display: inline-flex; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 3px; gap: 2px; }
        .tk-seg button { display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent; color: var(--text2); font-size: 12.5px; font-weight: 600; padding: 6px 12px; border-radius: 7px; cursor: pointer; transition: all 0.15s; }
        .tk-seg button:hover { color: var(--accent); }
        .tk-seg button.on { background: var(--surface); color: var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

        /* Category cards */
        .tk-card { transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s; }
        .tk-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.12); }
        .tk-iconchip { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tk-cardbtn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 11px; background: var(--surface); border: none; cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--text2); transition: all 0.15s; }
        .tk-cardbtn:hover { background: var(--surface2); color: var(--accent); }
        .tk-cardbtn.danger:hover { background: var(--danger-light); color: var(--danger); }

        /* Selector chips */
        .tk-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 22px; font-size: 12.5px; font-weight: 600; padding: 7px 15px; cursor: pointer; border: 1.5px solid var(--border); background: var(--surface); color: var(--text2); transition: all 0.15s; }
        .tk-chip:hover { border-color: var(--accent-light); color: var(--accent); }
        .tk-chip.on { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 10px rgba(35,71,217,0.28); }

        /* Grid */
        .tk-grid { border-collapse: separate; border-spacing: 0; }
        .tk-grid tbody tr:nth-child(even) td { background: rgba(35,71,217,0.022); }
        .tk-grid tbody tr:hover td { background: rgba(35,71,217,0.06); }
        .tk-grid tbody tr:hover td.tk-namecell { background: var(--accent-lighter); }

        .tk-cell { width: 100%; min-height: 36px; border-radius: 7px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; transition: all 0.12s; border: 1px solid transparent; }
        .tk-cell.paid { background: var(--success-light); color: #1a7a3a; font-weight: 700; border-color: var(--success-border); box-shadow: 0 1px 3px rgba(39,174,96,0.15); }
        .tk-cell.paid:hover { background: #d6efd9; transform: scale(1.04); }
        .tk-cell.empty { background: var(--surface2); color: var(--text3); border: 1px dashed var(--border); font-size: 17px; font-weight: 300; }
        .tk-cell.empty:hover { background: var(--accent); color: #fff; border-style: solid; border-color: var(--accent); }
        .tk-cell.partial { background: #fef0d9; color: var(--accent2-hover); font-weight: 700; border-color: #f3d9a8; }
        .tk-cell.partial:hover, .tk-cell.paid.late:hover { transform: scale(1.04); }
        .tk-cell.late { box-shadow: inset 0 0 0 1.5px var(--danger); color: var(--danger); }
        .tk-cellwrap { position: relative; }
        .tk-taksitbtn { position: absolute; right: 3px; bottom: 3px; width: 18px; height: 18px; padding: 0; border-radius: 5px; border: 1px solid var(--border); background: var(--surface); color: var(--text3); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.12s; }
        .tk-taksitbtn:hover { background: var(--accent2-hover, #c47814); border-color: transparent; color: #fff; }
        .tk-cell.ro { cursor: default; box-shadow: none; }
        .tk-cell.roempty { background: transparent; color: #cfc8ba; cursor: default; }

        /* Legend */
        .tk-legend { display: flex; gap: 18px; align-items: center; padding: 10px 16px; font-size: 11.5px; color: var(--text3); border-top: 1px solid var(--border-light); }
        .tk-legend .dot { width: 12px; height: 12px; border-radius: 4px; display: inline-block; margin-right: 6px; vertical-align: -2px; }
      `}</style>
    </div>
  )
}
