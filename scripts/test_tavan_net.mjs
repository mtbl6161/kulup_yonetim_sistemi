// copied from lib/hesaplama.ts

function gvDilimiBul(matrah, dilimler) {
  for (const d of dilimler) {
    if (matrah <= d.ust) return d.oran
  }
  return 0.40
}

function gelirVergisiHesapla(matrah, dilimler) {
  let vergi = 0
  let prev = 0
  let son_oran = 0
  for (const d of dilimler) {
    if (matrah <= prev) break
    const dilimIci = Math.min(matrah, d.ust) - prev
    if (dilimIci <= 0) { prev = d.ust; continue }
    vergi += dilimIci * d.oran
    son_oran = d.oran
    prev = d.ust
    if (matrah <= d.ust) break
  }
  return { oran: son_oran, tutar: Math.round(vergi * 100 + 1e-9) / 100 }
}

function gorevTavanYuzdesi(gorev) {
  const g = (gorev || '').toLowerCase()
  if (g.includes('koordinatör') || g.includes('koordinator')) return 275
  if (g.includes('usta')) return 400
  if (g.includes('öğretmen') || g.includes('ogretmen')) return 300
  if ((g.includes('başkan') || g.includes('baskan')) && !g.includes('yardımcı') && !g.includes('yardimci')) return 275
  if (g.includes('yardımcı') || g.includes('yardimci')) return 250
  if (g.includes('muhasebe') || g.includes('memur')) return 80
  if (g.includes('temizlik') || g.includes('hizmet') || g.includes('bakım')) return 80
  if (g.includes('denetim')) return 275
  return 300
}

function tavanHesapla(gorev, tavanKatsayi) {
  return Math.round(tavanKatsayi * gorevTavanYuzdesi(gorev) / 100 * 100 + 1e-9) / 100
}

function bordroHesapla(
  ayarlar,
  toplamSaat,
  yillikMatrah,
  sgkLi,
  isRetired,
  gorev,
  havuzBrut,
  vergiIstisnasi
) {
  const br0 = havuzBrut !== undefined ? havuzBrut : toplamSaat * ayarlar.saat_ucreti
  let brut = Math.round(br0 * 100 + 1e-9) / 100

  if (gorev && ayarlar.tavan_katsayi) {
    const tavan = tavanHesapla(gorev, ayarlar.tavan_katsayi)
    brut = Math.min(brut, tavan)
  }

  let sgk_kisi = 0
  let sgk_issizlik = 0

  if (sgkLi) {
    if (isRetired) {
      sgk_kisi = Math.round(brut * 0.075 * 100 + 1e-9) / 100
      sgk_issizlik = 0
    } else {
      sgk_kisi = Math.round(brut * (ayarlar.sgk_kisi_pay || 0.14) * 100 + 1e-9) / 100
      sgk_issizlik = Math.round(brut * (ayarlar.sgk_issizlik_kisi || 0.01) * 100 + 1e-9) / 100
    }
  }

  const gv_matrah = Math.round((brut - sgk_kisi - sgk_issizlik) * 100 + 1e-9) / 100
  const dilimler = ayarlar.vergi_dilimleri || []
  
  const gvOnceki = gelirVergisiHesapla(yillikMatrah || 0, dilimler)
  const gvYeniToplam = gelirVergisiHesapla((yillikMatrah || 0) + gv_matrah, dilimler)
  
  const gv_hesaplanan = Math.round((gvYeniToplam.tutar - gvOnceki.tutar) * 100 + 1e-9) / 100
  const gv_oran = gvYeniToplam.oran
  let gv_istisna = 0

  const dv_hesaplanan = Math.round(brut * ayarlar.damga_vergi_orani * 100 + 1e-9) / 100
  let dv_istisna = 0

  if (vergiIstisnasi) {
    if (ayarlar.gv_istisna_sabiti && ayarlar.gv_istisna_sabiti > 0) {
      gv_istisna = ayarlar.gv_istisna_sabiti
    } else if (ayarlar.asgari_ucret) {
      const asgariMatrah = ayarlar.asgari_ucret * (1 - (ayarlar.sgk_kisi_pay || 0.14) - (ayarlar.sgk_issizlik_kisi || 0.01))
      gv_istisna = Math.round(asgariMatrah * 0.15 * 100 + 1e-9) / 100
    }
    gv_istisna = Math.round(Math.min(gv_hesaplanan, gv_istisna) * 100 + 1e-9) / 100

    if (ayarlar.dv_istisna_sabiti && ayarlar.dv_istisna_sabiti > 0) {
      dv_istisna = ayarlar.dv_istisna_sabiti
    } else if (ayarlar.asgari_ucret) {
      dv_istisna = Math.round(ayarlar.asgari_ucret * ayarlar.damga_vergi_orani * 100 + 1e-9) / 100
    }
    dv_istisna = Math.round(Math.min(dv_hesaplanan, dv_istisna) * 100 + 1e-9) / 100
  }

  const gv = Math.round((gv_hesaplanan - gv_istisna) * 100 + 1e-9) / 100
  const dv = Math.round((dv_hesaplanan - dv_istisna) * 100 + 1e-9) / 100

  const toplam_kesinti = Math.round((gv + dv + sgk_kisi + sgk_issizlik) * 100 + 1e-9) / 100
  const net = Math.round((brut - toplam_kesinti) * 100 + 1e-9) / 100

  return { brut, net }
}

const ayarlar = {
  saat_ucreti: 64.75,
  gunluk_saat: 6,
  asgari_ucret: 33030,
  katsayi: 1.387871,
  gosterge: 140,
  sgk_kisi_pay: 0.14,
  sgk_issizlik_kisi: 0.01,
  sgk_kisa_vadeli: 0.0225,
  sgk_malulluk: 0.20,
  sgk_saglik: 0.125,
  sgk_issizlik_isveren: 0.03,
  damga_vergi_orani: 0.00759,
  yemek: true,
  gv_istisna_sabiti: 0,
  dv_istisna_sabiti: 0,
  vergi_dilimleri: [
    { ust: 190000, oran: 0.15 },
    { ust: 400000, oran: 0.2 },
    { ust: 1500000, oran: 0.27 },
    { ust: 5300000, oran: 0.35 },
    { ust: 30000000, oran: 0.4 }
  ],
  tavan_katsayi: 13184.77
}

const TAVAN_KATEGORILER = [
  { label: 'Başkan',                    gorev: 'Başkan',              sgkLi: false },
  { label: 'Başkan Yardımcısı',         gorev: 'Başkan Yardımcısı',   sgkLi: false },
  { label: 'Öğretmen',                  gorev: 'Öğretmen',            sgkLi: false },
  { label: 'Koordinatör Öğretmen',      gorev: 'Koordinatör Öğretmen',sgkLi: false },
  { label: 'Usta Öğretici',             gorev: 'Usta Öğretici',       sgkLi: true  },
  { label: 'Usta Öğretici (Emekli)',    gorev: 'Usta Öğretici',       sgkLi: true, isRetired: true },
  { label: 'Muhasebe Memuru',           gorev: 'Muhasebe Personeli',  sgkLi: true  },
  { label: 'Muhasebe Memuru (Emekli)',  gorev: 'Muhasebe Personeli',  sgkLi: true, isRetired: true },
  { label: 'Temizlik Personeli',        gorev: 'Temizlik Personeli',  sgkLi: true  },
  { label: 'Temizlik Personeli (Emekli)', gorev: 'Temizlik Personeli',sgkLi: true, isRetired: true },
]

for (const kat of TAVAN_KATEGORILER) {
  const brut = tavanHesapla(kat.gorev, ayarlar.tavan_katsayi)
  
  // Calculate net tavan
  const sonuc = bordroHesapla(
    ayarlar,
    0, // hours
    0, // cumulative matrah
    kat.sgkLi,
    !!kat.isRetired,
    kat.gorev,
    brut,
    true // vergiIstisnasi
  )

  console.log(`${kat.label}: Brut: ${brut.toFixed(2)}, Net: ${sonuc.net.toFixed(2)}`)
}
