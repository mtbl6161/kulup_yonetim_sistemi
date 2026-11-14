import Image from 'next/image'
import Link from 'next/link'
import { Fragment } from 'react'
import './tanitim.css'
import { TanitimNav } from './TanitimNav'
import { SORULAR, TANITIM_YAPISAL_VERI, type Soru } from './sorular'
import { AYLIK_UCRET, DENEME_GUN, YILLIK_TASARRUF, YILLIK_UCRET, tl } from '@/lib/abonelikPlanlari'

// Tanıtım sayfası. Tasarım kaynağı: tasarim-onerileri/tanitim/famly-tarzi.html (stiller tanitim.css'te, .tn kabıyla sınırlı).
// Sayfa sunucuda üretilir; yalnızca menü (oturum ve mobil menü) istemci bileşenidir.

export default function TanitimPage() {
  return (
    <div className="tn">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(TANITIM_YAPISAL_VERI) }} />
      <a className="atla" href="#icerik">İçeriğe geç</a>
      <TanitimNav />
      <main id="icerik" tabIndex={-1}>

      <section className="hero" aria-label="Tanıtım">
        <div className="kap hero-ic">
          <div>
            <h1>Dosya dosya değil, tıkla tıkla.</h1>
            <p className="ozet">Çocuk kulübünün klasörlerle dolu ay sonu tek ekrana sığar: aidat, bordro, muhtasar ve denetim dosyası.</p>
            <div className="eylemler">
              <Link href="/signup" className="btn btn-ana">{DENEME_GUN} gün ücretsiz deneyin</Link>
              <a href="/demo" className="btn btn-cer">Demoyu deneyin</a>
            </div>
            <div className="guven">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              <span>{DENEME_GUN} gün ücretsiz, kredi kartı istenmez. Sonra aylık ₺{tl(AYLIK_UCRET)}, kurum başına sabit fiyat.</span>
            </div>
          </div>

          <div className="sahne foto">
            <Image className="pano-foto" src="/tanitim/ogretmen.webp" alt="Sınıfta dizüstü bilgisayarıyla çalışan bir kulüp sorumlusu öğretmen; arkada el işi yapan çocuklar" width={1400} height={788} sizes="(max-width: 1100px) 100vw, 50vw" preload />
            <div className="foto-not" aria-hidden="true"><b>Ay sonunu gülümseyerek karşılayın.</b>Bordro, aidat, muhtasar: hepsi yerli yerinde.</div>
          </div>
        </div>

      </section>


      <section className="kimler" aria-labelledby="kimler-bas">
        <div className="kap">
          <h2 id="kimler-bas">Kulübü yürüten <em>herkes</em> için tek sistem</h2>
          <div className="kim-satir">
            <div className="rol c"><div className="rol-ust"><span className="ik ik-mercan"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18M8 15l2 2 4-4" /></svg></span><div><h3>Kulüp sorumluları</h3><p>Günlük işleri girer, gerisi hesaplanır.</p></div></div><ul className="rol-liste" role="list"><li>Kayıt ve yoklamayı girer</li><li>Aidat tahsilatını işler</li><li>Puantajı hazırlar</li></ul></div>
            <div className="rol y"><div className="rol-ust"><span className="ik ik-yesil"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 6h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01M9 18h6" /></svg></span><div><h3>Muhasebeciler</h3><p>Bordroyu yeniden yazmadan hazır bulur.</p></div></div><ul className="rol-liste" role="list"><li>Bordroyu kontrol eder</li><li>Muhtasar XML’ini indirir</li><li>Banka ödeme listesini alır</li></ul></div>
            <div className="rol l"><div className="rol-ust"><span className="ik ik-lacivert"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span><div><h3>İl denetçileri</h3><p>İldeki dosyaları tek listeden inceler.</p></div></div><ul className="rol-liste" role="list"><li>Dosyaları okul okul açar</li><li>Bordro farklarını görür</li><li>Onaylar ya da notla iade eder</li></ul></div>
          </div>
        </div>
      </section>


      <section className="bolum" aria-labelledby="ks-bas" style={{ paddingBottom: '0' }}>
        <div className="kap">
          <h2 className="orta-baslik" id="ks-bas" style={{ maxWidth: '18ch' }}>Ay sonu artık bir koşturma değil</h2>
          <p className="orta-ozet">Aynı işler, iki farklı ay.</p>
          <div className="bs-izgara" lang="tr">
            <div className="bs-kart bs-once"><div className="bs-ust"><h3>Bugün</h3><span className="bs-rozet">Dağınık</span></div><ul className="bs-liste" role="list"><li><span className="kutu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg></span><div><b>Kayıtlar</b><span>Yoklama defterde, aidat Excel’de, bordro muhasebecide</span></div></li><li><span className="kutu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></span><div><b>Bilgi girişi</b><span>Aynı öğrenci ve personel bilgisi her ay yeniden yazılır</span></div></li><li><span className="kutu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M10 13l-2 2 2 2m4-4 2 2-2 2" /></svg></span><div><b>Muhtasar</b><span>Bordrolar muhasebeciye gönderilir, beyanname ayrıca hazırlanır</span></div></li><li><span className="kutu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg></span><div><b>Denetim dosyası</b><span>Ay sonunda klasör klasör toplanır</span></div></li></ul></div>
            <div className="bs-ok" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></div>
            <div className="bs-kart bs-sonra"><div className="bs-ust"><h3>Klüp360 ile</h3><span className="bs-rozet">Tek sistem</span></div><ul className="bs-liste" role="list"><li><span className="kutu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg></span><div><b>Kayıtlar</b><span>Yoklama, aidat ve bordro tek sistemde, birbirine bağlı</span></div></li><li><span className="kutu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></span><div><b>Bilgi girişi</b><span>Bilgi bir kez girilir, sonraki aylarda yeniden yazılmaz</span></div></li><li><span className="kutu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M10 13l-2 2 2 2m4-4 2 2-2 2" /></svg></span><div><b>Muhtasar</b><span>Muhtasar XML dosyası bordrodan hazırlanır</span></div></li><li><span className="kutu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg></span><div><b>Denetim dosyası</b><span>Ay boyunca girilen kayıtlarla dolar</span></div></li></ul></div>
          </div>
        </div>
      </section>


      <section className="bolum" id="ozellikler" aria-labelledby="oz-bas">
        <div className="kap">
          <h2 className="orta-baslik" id="oz-bas">Bir kez girin, bir daha yazmayın</h2>
          <p className="orta-ozet">Sınıf defterindeki dersler puantaja, puantaj bordroya, bordro muhtasara geçer. Aidat ve diğer tahsilatlar işletme defterine işlenir; aynı rakamı iki kez yazmazsınız.</p>

          <div className="oz-liste" lang="tr">
          <div className="oz mercan">
            <div className="oz-sahne"><div className="oz-pen"><div className="oz-pen-ust"><span className="oz-nok" aria-hidden="true"><i></i><i></i><i></i></span>Aidat takibi<span className="oz-sag">Kasım 2026</span></div><div className="oz-tah"><div className="oz-tah-ust"><span>Bu ay tahsil edilen</span><b className="num">₺2.800 <small>/ ₺5.250</small></b></div><div className="oz-cubuk" aria-hidden="true"><i style={{ width: '53%' }}></i></div></div><div className="oz-ogr"><span className="oz-av" style={{ background: '#fff1eb', color: '#c2410c' }} aria-hidden="true">EY</span><span className="oz-ad"><b>Elif Y.</b><span>Papatyalar</span></span><span className="rozet r-ok">Tahsil edildi</span><span className="oz-tt num">₺1.400</span></div><div className="oz-ogr"><span className="oz-av" style={{ background: '#eef2fe', color: '#1b38b8' }} aria-hidden="true">CD</span><span className="oz-ad"><b>Can D.</b><span>Laleler</span></span><span className="rozet r-bek">Bekleniyor</span><span className="oz-tt num">₺1.400</span></div><div className="oz-ogr"><span className="oz-av" style={{ background: '#e4f4ec', color: '#0b7a4b' }} aria-hidden="true">ZK</span><span className="oz-ad"><b>Zeynep K.</b><span>Papatyalar</span></span><span className="rozet r-mav">Kardeş indirimi</span><span className="oz-tt num">₺1.050</span></div><div className="oz-ogr"><span className="oz-av" style={{ background: '#e9ecf7', color: '#14287f' }} aria-hidden="true">MA</span><span className="oz-ad"><b>Mert A.</b><span>Menekşeler</span></span><span className="rozet r-ok">Tahsil edildi</span><span className="oz-tt num">₺1.400</span></div></div><div className="oz-bildirim"><span className="oz-bik yesil"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span><div><b>Banka ekstresi yüklendi</b><span>2 ödeme öğrencilerle eşleşti</span></div></div></div>
            <div className="oz-metin"><span className="oz-et"><span className="oz-eik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h4" /></svg></span>Aidat ve tahsilat</span><h3>Çocuk kulübü aidatı kayıtla birlikte hesaplanır</h3><p>Aidat iş gününe, ders saatine ve kardeş indirimine göre hesaplanır. Banka ekstresini yükleyin; ödemeler öğrencilerle eşleşip işletme defterine işlenir.</p><ul className="oz-tik" role="list"><li>Banka ekstresiyle eşleşme</li><li>Kardeş indirimi</li><li>Geciken ödemeler listesi</li><li>Gezi ve etkinlik tahsilatı</li><li>Veliye ödeme dökümü</li><li>Ücretsiz öğrenci</li></ul><div className="oz-alt"><Link href="/cocuk-kulubu-aidat-hesaplama" className="oz-git">Aidat hesaplama aracını deneyin <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></Link></div></div>
          </div>
          <div className="oz yesil ters">
            <div className="oz-sahne"><div className="oz-pen"><div className="oz-pen-ust"><span className="oz-nok" aria-hidden="true"><i></i><i></i><i></i></span>Ücret zarfı<span className="oz-sag">Kasım 2026</span></div><div className="oz-zarf"><div><span>Personel</span><b>Ayşe K.</b></div><div><span>Görev</span><b>Usta öğretici</b></div><div><span>Ders saati</span><b className="num">96</b></div><div><span>Ders saati ücreti</span><b className="num">₺223,75</b></div><div><span>Brüt ücret</span><b className="num">₺21.480,00</b></div><div><span>SGK ve işsizlik payı</span><b className="num">₺3.222,00</b></div><div><span>Gelir vergisi</span><b className="num">₺0,00</b></div><div><span>Damga vergisi</span><b className="num">₺0,00</b></div><p className="oz-zarf-not">Gelir ve damga vergisinde asgari ücret istisnası uygulandı</p><div className="oz-net"><span>Ödenecek net</span><span className="num">₺18.258,00</span></div></div></div><div className="oz-bildirim"><span className="oz-bik yesil"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 6 12 13 2 6" /><rect x="2" y="4" width="20" height="16" rx="2" /></svg></span><div><b>Ücret zarfları gönderildi</b><span>Personele e-postayla</span></div></div></div>
            <div className="oz-metin"><span className="oz-et"><span className="oz-eik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 6h6M9 11h6M9 15h6M9 18h3" /></svg></span>Bordro ve ücret zarfı</span><h3>Çocuk kulübü bordrosu puantajdan hesaplanır</h3><p>Sınıf defterindeki dersler puantaja, puantaj bordroya geçer. MEB katsayıları, 2026 SGK oranları ve gelir vergisi dilimleri hesaba katılır.</p><ul className="oz-tik" role="list"><li>Kişi başı ücret zarfı (PDF)</li><li>Zarflar personele e-postayla</li><li>Banka ödeme listesi</li><li>Asgari ücret istisnası</li><li>SGK ve işsizlik payları</li><li>Güncellenebilir vergi dilimleri</li></ul><div className="oz-alt"><Link href="/cocuk-kulubu-bordro-hesaplama" className="oz-git">Bordro hesaplama aracını deneyin <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></Link><Link href="/gelir-vergisi-dilimleri-2026" className="oz-ikincil">2026 gelir vergisi dilimleri</Link></div></div>
          </div>
          <div className="oz mavi">
            <div className="oz-sahne"><div className="oz-pen"><div className="oz-pen-ust"><span className="oz-nok" aria-hidden="true"><i></i><i></i><i></i></span>Muhtasar dosyası<span className="oz-sag">Ekim 2026 dönemi</span></div><div className="oz-dos"><div>Son gün<b>26 Kasım</b></div><div>Çalışan<b className="num">14</b></div><div>Muhtasar matrahı<b>Bordrodan</b></div><div>Prim günleri<b>Puantajdan</b></div></div><div className="oz-dosya"><span className="oz-dik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M10 13l-2 2 2 2m4-4 2 2-2 2" /></svg></span><div><b>MUHSGK_2026_10.xml</b><span>e-Beyanname’ye yüklemeye hazır</span></div><span className="oz-in"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14" /></svg></span></div><details className="xml-ac"><summary>Dosyanın içini görün (XML)</summary>
      <pre className="xml" tabIndex={0} role="region" aria-label="Muhtasar beyannamesi XML dosyasından kısaltılmış satırlar">{XML_ORNEK}</pre></details></div><div className="oz-bildirim"><span className="oz-bik mavi"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span><div><b>Kontrol tamamlandı</b><span>Eksik bilgi bulunmadı</span></div></div></div>
            <div className="oz-metin"><span className="oz-et"><span className="oz-eik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M10 13l-2 2 2 2m4-4 2 2-2 2" /></svg></span>Muhtasar ve prim hizmet</span><h3>Muhtasarı yeniden yazmayın: MUHSGK XML hazır</h3><p>Bordroyu hesapladığınızda muhtasar ve prim hizmet beyannamesinin XML dosyası da hazırdır. İndirin, e-Beyanname’ye yükleyin; personeli tek tek yeniden girmezsiniz.</p><ul className="oz-tik" role="list"><li>GİB’in istediği 22. sürüm</li><li>Muhtasar ve SGK tek dosyada</li><li>Eksik gün puantajdan</li><li>Eksik gün nedeni listeden</li><li>Eksik bilgide önceden uyarı</li><li>Son gün yaklaşınca panelde uyarı</li></ul></div>
          </div>
          <div className="oz lac ters">
            <div className="oz-sahne"><div className="oz-pen"><div className="oz-pen-ust"><span className="oz-nok" aria-hidden="true"><i></i><i></i><i></i></span>Denetim dosyası<span className="oz-sag">Kasım 2026</span></div><div className="oz-tah"><div className="oz-tah-ust"><span>Hazır belgeler</span><b className="num">12 <small>/ 13</small></b></div><div className="oz-cubuk lac" aria-hidden="true"><i style={{ width: '92%' }}></i></div></div><div className="oz-madde"><span className="oz-k" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span><span className="oz-mad">Personel listesi ve görevleri</span><span className="rozet r-ok">Sistemden</span></div><div className="oz-madde"><span className="oz-k" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span><span className="oz-mad">Aylık puantaj ve bordro</span><span className="rozet r-ok">Sistemden</span></div><div className="oz-madde"><span className="oz-k" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span><span className="oz-mad">Ücret dağıtım bilançosu</span><span className="rozet r-ok">Sistemden</span></div><div className="oz-madde"><span className="oz-k u" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 7v6M12 17h.01" /></svg></span><span className="oz-mad">SGK hizmet listesi</span><span className="rozet r-bek">Yüklenecek</span></div></div><div className="oz-bildirim"><span className="oz-bik mercan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg></span><div><b>Denetçiden not</b><span>SGK hizmet listesini ekleyin</span></div></div></div>
            <div className="oz-metin"><span className="oz-et"><span className="oz-eik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="m9 13 2 2 4-4" /></svg></span>Denetim dosyası</span><h3>Denetim dosyası ay boyunca dolar</h3><p>Personel listesi, puantaj, bordro ve bilanço gibi sistemin ürettiği belgeler dosyaya eklenir. Siz yalnızca imzalı ve dışarıdan gelen belgeleri yüklersiniz.</p><ul className="oz-tik" role="list"><li>İlinizin evrak listesi hazır</li><li>Eksikler madde madde</li><li>Hazır olunca denetçiye gönderim</li><li>Denetçinin notu dosyada</li></ul></div>
          </div>
          </div>
        </div>
      </section>

      <div className="kap"><div className="cs"><div className="cs-sol"><div className="cs-yigin" aria-hidden="true"><span className="cs-ik mercan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h4" /></svg></span><span className="cs-ik yesil"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 6h6M9 11h6M9 15h6M9 18h3" /></svg></span><span className="cs-ik mavi"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M10 13l-2 2 2 2m4-4 2 2-2 2" /></svg></span><span className="cs-ik lac"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="m9 13 2 2 4-4" /></svg></span></div><div><p className="cs-bas">Aidat, bordro, muhtasar ve denetim tek yerde.</p><p className="cs-alt">Bu ayın işlerini Klüp360’ta deneyin ya da önce demoyu açın; demoda girdiğiniz bilgiler kaydedilmez.</p></div></div><div className="cs-dug"><a href="/demo" className="btn btn-cer">Demoyu açın</a><Link href="/signup" className="btn btn-ana">{DENEME_GUN} gün ücretsiz deneyin</Link></div></div></div>


      <section className="bolum" id="fiyat" aria-labelledby="fy-bas">
        <div className="kap">
          <h2 className="orta-baslik" id="fy-bas" style={{ maxWidth: 'none' }}>Kurum başına tek fiyat</h2>
          <p className="orta-ozet">Öğrenci, personel ve sınıf sayısında sınır yoktur. Kulübünüz büyüdükçe fiyat değişmez.</p>
          <div className="fiyat-izgara">
            <div className="plan">
              <h3>Aylık</h3>
              <div className="tutar num">₺{tl(AYLIK_UCRET)} <small>/ ay</small></div>
              <p className="alt">İstediğiniz ay bırakabilirsiniz.</p>
              <ul className="tikler" role="list"><li>Bütün modüller</li><li>Sınırsız öğrenci ve personel</li><li>İptal ücreti yok</li></ul>
            </div>
            <div className="plan one">
              <span className="etiket">İki ay ücretsiz</span>
              <h3>Yıllık</h3>
              <div className="tutar num">₺{tl(YILLIK_UCRET)} <small>/ yıl</small></div>
              <p className="alt">Aylık ödemeye göre ₺{tl(YILLIK_TASARRUF)} daha az.</p>
              <ul className="tikler" role="list"><li>Bütün modüller</li><li>Sınırsız öğrenci ve personel</li><li>İptal ücreti yok</li></ul>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '30px' }}><Link href="/signup" className="btn btn-ana">{DENEME_GUN} gün ücretsiz deneyin</Link></div>
          <p className="fiyat-not">Planı deneme bitince seçersiniz. Ödemeden sonraki 14 gün içinde iptal ederseniz ücretin tamamı iade edilir. Birden fazla okul için <Link href="/tanitim/iletisim" className="metin-bag">indirimli teklif isteyin</Link>. İptal, Ayarlar › Abonelik’teki müşteri portalından kimseyle görüşmeden yapılır. <Link href="/fiyatlandirma" className="metin-bag">Fiyatların ayrıntısı</Link></p>
        </div>
      </section>


      <section className="fihrist" aria-labelledby="fh-bas">
        <div className="kap">
          <div className="dh-sar" lang="tr">
            <div className="dh-menu" aria-hidden="true"><div className="dh-menu-bas"><i>ü</i>Klüp360</div><div className="dh-menu-et">Kulüp</div><div className="dh-m on"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></svg>Öğrenciler</div><div className="dh-m on"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></svg>Sınıflar</div><div className="dh-m on"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18M8 14h3M8 17h6" /></svg>Ders programı</div><div className="dh-m"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4Z" /><path d="M8 9h8M8 13h5" /></svg>Sınıf defteri</div><div className="dh-menu-et">Personel</div><div className="dh-m on"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="9" cy="11" r="2.5" /><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3" /></svg>Personel</div><div className="dh-m"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 6h6M9 11h6M9 15h6" /></svg>Puantaj ve bordro</div><div className="dh-menu-et">Para</div><div className="dh-m"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h4" /></svg>Tahsilat</div><div className="dh-m on"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></svg>Gelir ve gider</div><div className="dh-m on"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" /></svg>Okul Aile Birliği</div><div className="dh-menu-et">Resmî</div><div className="dh-m"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M10 13l-2 2 2 2m4-4 2 2-2 2" /></svg>Muhtasar</div><div className="dh-m"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>Denetim dosyası</div><div className="dh-m on"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 17v-3M12 17v-6M16 17v-2" /></svg>Raporlar</div></div>
            <div>
              <h2 id="fh-bas">Kulübün diğer işleri de aynı sistemde</h2>
              <p className="dh-ozet">Öğrenciden rapora, günlük işlerin hepsi aynı kayıtlardan beslenir.</p>
              <ul className="dh-liste" role="list"><li className="dh-gm"><span className="dh-ik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></svg></span><div><h3>Öğrenciler</h3><p>Veli iletişimi, grup ve kardeş bilgisi tek kayıtta.</p></div></li><li className="dh-gm"><span className="dh-ik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></svg></span><div><h3>Sınıflar ve kontenjan</h3><p>Yaş grubu ve kapasite; doluluk panelde izlenir.</p></div></li><li className="dh-gy"><span className="dh-ik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18M8 14h3M8 17h6" /></svg></span><div><h3>Ders programı</h3><p>Sınıf ve öğretmen bazlı haftalık program; sınıf defterine aktarılır.</p></div></li><li className="dh-gy"><span className="dh-ik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="9" cy="11" r="2.5" /><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3" /></svg></span><div><h3>Personel</h3><p>Görev, SGK durumu, IBAN ve iletişim bilgileri tek kayıtta.</p></div></li><li className="dh-ga"><span className="dh-ik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></svg></span><div><h3>Gelir, gider ve bilanço</h3><p>Aylık kâr-zarar, ücret dağıtım bilançosu, hesap hareketleri ve taksit planları.</p></div></li><li className="dh-ga"><span className="dh-ik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" /></svg></span><div><h3>Okul Aile Birliği</h3><p>Bağış ve aidat tahsilatı, birliğin kendi işletme defteri.</p></div></li><li className="dh-gl"><span className="dh-ik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg></span><div><h3>Panel uyarıları</h3><p>Geciken ödeme, eksik puantaj ve yaklaşan beyanname günü panelde.</p></div></li><li className="dh-gl"><span className="dh-ik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 17v-3M12 17v-6M16 17v-2" /></svg></span><div><h3>Raporlar</h3><p>Aylık özet, işletme defteri ve bilanço PDF olarak.</p></div></li></ul>
            </div>
          </div>
        </div>
      </section>


      <section className="bolum" id="denetci" aria-labelledby="dn-bas">
        <div className="kap">
          <div className="dn-bant" lang="tr">
            <div className="dn-metin">
              <span className="dn-et"><span className="dn-eik"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>İl denetçileri için</span>
              <h2 id="dn-bas">Denetçi dosyanızı aynı sistemden inceler</h2>
              <p>İl Millî Eğitim Müdürlüğü denetçileri ildeki kulüplerin aylık dosyalarını tek listede görür. Belgeleri açar, bordroyu sistemin yeniden hesabıyla karşılaştırır; dosyayı onaylar ya da notla iade eder.</p>
              <ul className="dn-tik" role="list"><li>İl geneli özet, ilçeye göre süzme</li><li>Bordro farkları listelenir</li><li>Denetçi yalnızca görür, değiştiremez</li></ul>
              <div className="dn-alt"><Link href="/login?type=denetim" className="btn dn-btn">Denetçi girişi</Link></div>
            </div>
            <div className="dn-sahne">
              <div className="dn-pen"><div className="dn-pen-ust"><span className="dn-nok" aria-hidden="true"><i></i><i></i><i></i></span>İl denetim listesi<span className="dn-sag">Kasım 2026</span></div><div className="dn-ozet"><div>Gönderilen<b className="num">24</b></div><div className="y">Onaylanan<b className="num">15</b></div><div>İncelemede<b className="num">6</b></div><div className="c">İade<b className="num">3</b></div></div><div className="dn-okul"><span className="dn-av"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></svg></span><span><b>Papatya İlkokulu</b><small className="dn-fark">Bordro farkı ₺240,00</small></span><span className="rozet r-bek">İncelemede</span></div><div className="dn-okul"><span className="dn-av"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></svg></span><span><b>Çınar İlkokulu</b><small>Kuzey · 13 / 13 belge</small></span><span className="rozet r-ok">Onaylandı</span></div><div className="dn-okul"><span className="dn-av"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></svg></span><span><b>Lale İlkokulu</b><small>Güney · 13 / 13 belge</small></span><span className="rozet r-mav">Gönderildi</span></div><div className="dn-okul"><span className="dn-av"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></svg></span><span><b>Menekşe İlkokulu</b><small>Doğu · 13 / 13 belge</small></span><span className="rozet r-ok">Onaylandı</span></div></div>
              <div className="dn-bildirim"><span className="dn-bik"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span><div><b>Çınar İlkokulu onaylandı</b><span>Kasım dosyası · 13 / 13 belge</span></div></div>
            </div>
          </div>
        </div>
      </section>


      <section className="bolum" id="sorular" style={{ paddingTop: '0' }} aria-labelledby="ss-bas">
        <div className="kap">
          <h2 className="orta-baslik" id="ss-bas" style={{ maxWidth: 'none' }}>Sık sorulan sorular</h2>
          <div className="sorular">
            {SORULAR.map(({ soru, cevap, bag }, i) => (
              <details key={soru} open={i === 0}><summary>{soru}</summary><p>{cevapParcala(cevap, bag)}</p></details>
            ))}

          </div>
        </div>
      </section>


      <section className="kapanis" aria-labelledby="kp-bas">
        <div className="kap">
          <div className="kapanis-kutu">
            <div>
              <h2 id="kp-bas">Bu ayı Klüp360’ta kapatın</h2>
              <ol className="adimlar" role="list">
                <li>Kurumunuzu kaydedin; okul, SGK ve vergi bilgilerini girin.</li>
                <li>Öğrenci ve personel listelerinizi Excel’den aktarın.</li>
                <li>Ayı yönetin: yoklama, tahsilat, bordro, muhtasar ve denetim dosyası.</li>
              </ol>
            </div>
            <div className="kapanis-eylem">
              <Link href="/signup" className="btn btn-beyaz">{DENEME_GUN} gün ücretsiz deneyin</Link>
              <small>Kredi kartı istenmez. Deneme bitince kayıtlarınız silinmez.</small>
              <Link href="/tanitim/iletisim" className="acik">Kurulumda yardım ister misiniz? Bize yazın</Link>
            </div>
          </div>
        </div>
      </section>
      </main>

      <footer>
        <div className="kap alt-ic">
          <span>© {new Date().getFullYear()} Klüp360 · MEB çocuk kulüpleri için yönetim sistemi. Klüp360, MEB’in resmî ürünü değildir.</span>
          <div className="alt-bag">
            <Link href="/rehber">Rehber</Link><Link href="/cocuk-kulubu-bordro-hesaplama">Bordro hesaplama</Link><Link href="/cocuk-kulubu-aidat-hesaplama">Aidat hesaplama</Link><Link href="/ek-ders-hesaplama">Ek ders hesaplama</Link><Link href="/cocuk-kulubu-butce-tablosu">Bütçe tablosu</Link><Link href="/fiyatlandirma">Fiyatlandırma</Link><Link href="/tanitim/kullanim-kosullari">Kullanım koşulları</Link><Link href="/tanitim/gizlilik-politikasi">Gizlilik</Link><Link href="/tanitim/kvkk-aydinlatma-metni">KVKK</Link><Link href="/tanitim/iade-politikasi">İade</Link><Link href="/tanitim/iletisim">İletişim</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** Cevaptaki {bag} yer tutucusunu bağlantıya çevirir */
function cevapParcala(cevap: string, bag: Soru['bag']) {
  if (!bag) return cevap
  const [once, sonra] = cevap.split('{bag}')
  return <Fragment>{once}<Link href={bag.href} className="metin-bag">{bag.metin}</Link>{sonra}</Fragment>
}

// Sistemin ürettiği dosyanın kısaltılmış satırları; etiket adları lib/muhsgk.ts ile aynı
const XML_ORNEK = `<?xml version="1.0" encoding="ISO-8859-9"?>
<beyanname kodVer="MUHSGK_22" …>
  <genel>
    <idari>
      <vdKodu>…</vdKodu>
      <donem>
        <tip>aylik</tip><yil>2026</yil><ay>10</ay>
      </donem>
    </idari> …
  </genel>
  <ozel>
    <matrahBildirimleri>
      <matrahBildirimi>
        <turKodu>…</turKodu>
        <gayrisafiTutar>…</gayrisafiTutar> …
  </ozel>
  <ekler> … <calisanBilgisi> …`
