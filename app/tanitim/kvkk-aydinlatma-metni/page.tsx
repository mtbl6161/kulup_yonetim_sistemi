import type { Metadata } from 'next'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | Klüp360',
  description: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında Klüp360 kişisel veri işleme aydınlatma metni.',
  alternates: { canonical: 'https://www.klup360.com/tanitim/kvkk-aydinlatma-metni' },
}

// Veri sorumlusunun resmî kimlik bilgileri — yayından önce şirketin ticaret unvanı,
// adresi ve MERSİS numarasıyla doldurulmalı (KVKK md. 10/1-a).
const VERI_SORUMLUSU = {
  unvan: 'Klüp360',
  adres: '',
  mersis: '',
  eposta: 'destek@klup360.com',
}

export default function KvkkAydinlatmaPage() {
  return (
    <PublicShell>
      <section className="pub-hero">
        <div className="pub-container">
          <span className="pub-badge"><span className="pub-badge-dot" /> Yasal</span>
          <h1 className="pub-h1">KVKK <span className="pub-grad">Aydınlatma Metni</span></h1>
          <p className="pub-lead">6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi uyarınca kişisel verilerinizin nasıl işlendiğini açıklıyoruz.</p>
        </div>
      </section>

      <section className="pub-section">
        <div className="pub-container">
          <div className="pub-prose">
            <h2>1. Veri sorumlusu ve veri işleyen</h2>
            <p>
              Klüp360 hesabını açan kurum yetkilisi ile kullanıcıların hesap ve iletişim bilgileri bakımından veri sorumlusu
              {' '}<strong>{VERI_SORUMLUSU.unvan}</strong>’dur{VERI_SORUMLUSU.adres ? ` (${VERI_SORUMLUSU.adres}${VERI_SORUMLUSU.mersis ? `, MERSİS: ${VERI_SORUMLUSU.mersis}` : ''})` : ''}.
            </p>
            <p>
              Kurumların sisteme girdiği öğrenci, veli ve personel verileri bakımından veri sorumlusu ilgili okul / çocuk kulübüdür;
              Klüp360 bu verileri yalnızca kurum adına ve kurumun talimatıyla işleyen <strong>veri işleyen</strong> konumundadır.
              Bu verilere ilişkin başvurular öncelikle ilgili kuruma yapılmalıdır.
            </p>

            <h2>2. İşlenen kişisel veriler</h2>
            <ul>
              <li><strong>Kimlik:</strong> ad, soyad, T.C. kimlik numarası (öğrenci, veli ve personel kayıtları).</li>
              <li><strong>İletişim:</strong> e-posta adresi, telefon numarası, adres.</li>
              <li><strong>Mesleki ve özlük:</strong> görev, kadro / sigorta durumu, SGK numarası, meslek kodu, ders saatleri ve puantaj.</li>
              <li><strong>Finansal:</strong> IBAN, ücret, bordro, vergi ve SGK kesintileri, aidat ve tahsilat kayıtları.</li>
              <li><strong>İşlem güvenliği:</strong> giriş kayıtları, IP adresi, işlem (denetim) kayıtları.</li>
            </ul>

            <h2>3. İşleme amaçları</h2>
            <ul>
              <li>Hizmet sözleşmesinin kurulması ve ifası: hesap açma, abonelik ve faturalama.</li>
              <li>Kurumun MEB Çocuk Kulüpleri Yönergesi kapsamındaki yükümlülükleri: öğrenci kaydı, ders programı, sınıf defteri, puantaj, bordro, tahakkuk, işletme defteri ve denetim dosyası.</li>
              <li>Ücret bordrosu ve bildirimlerin hazırlanması, ilgili kişilere e-postayla iletilmesi.</li>
              <li>Bilgi güvenliğinin sağlanması, yetkisiz erişimin ve kötüye kullanımın önlenmesi.</li>
              <li>Destek taleplerinin ve iletişim formu başvurularının yanıtlanması.</li>
            </ul>

            <h2>4. Hukuki sebepler ve toplama yöntemi</h2>
            <p>
              Kişisel veriler; kurum yetkililerinin ve kullanıcıların sisteme girişleri, Excel / banka ekstresi içe aktarımı ve
              iletişim formu aracılığıyla elektronik ortamda toplanır. Veriler KVKK md. 5/2 uyarınca
              <em> sözleşmenin kurulması ve ifası</em> (c), <em>veri sorumlusunun hukuki yükümlülüğü</em> (ç),
              <em> bir hakkın tesisi, kullanılması veya korunması</em> (e) ve <em>meşru menfaat</em> (f) hukuki sebeplerine dayanılarak işlenir.
            </p>

            <h2>5. Aktarım</h2>
            <p>
              Veriler; barındırma, veritabanı, e-posta gönderimi ve ödeme hizmeti aldığımız tedarikçilerle (bulut altyapısı,
              e-posta servis sağlayıcısı, ödeme kuruluşu) yalnızca hizmetin sunulması için gerekli ölçüde paylaşılır. Bu
              hizmet sağlayıcıların sunucularının bir kısmı yurt dışında bulunduğundan aktarım KVKK md. 9’daki şartlara uygun
              olarak yapılır. Kanunen yetkili kamu kurum ve kuruluşlarına, talep hâlinde ve mevzuatın gerektirdiği ölçüde aktarım yapılabilir.
              Veriler reklam veya pazarlama amacıyla üçüncü kişilerle paylaşılmaz.
            </p>

            <h2>6. Saklama süresi</h2>
            <p>
              Veriler, işleme amacının gerektirdiği süre ve ilgili mevzuatta (vergi, SGK ve MEB mevzuatı) öngörülen saklama
              süreleri boyunca tutulur; sürenin sonunda silinir, yok edilir veya anonim hâle getirilir.
            </p>

            <h2>7. Haklarınız (KVKK md. 11)</h2>
            <p>Veri sorumlusuna başvurarak;</p>
            <ul>
              <li>kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme,</li>
              <li>işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
              <li>yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
              <li>eksik veya yanlış işlenmişse düzeltilmesini, şartları oluşmuşsa silinmesini veya yok edilmesini isteme ve bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme,</li>
              <li>münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
              <li>kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
            </ul>
            <p>haklarına sahipsiniz.</p>

            <h2>8. Başvuru</h2>
            <p>
              Taleplerinizi <a href={`mailto:${VERI_SORUMLUSU.eposta}`}>{VERI_SORUMLUSU.eposta}</a> adresine veya{' '}
              <a href="/tanitim/iletisim">iletişim sayfamız</a> üzerinden iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
