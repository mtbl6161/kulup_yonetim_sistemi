// Tanıtım sayfasının "sık sorulan sorular" bölümü ve arama motorları için yapılandırılmış verisi.
// JSON-LD aynı metinden üretilir,
// böylece görünen cevaplarla arama motorlarına verilen cevaplar hep aynı kalır.
import { AYLIK_UCRET, DENEME_GUN, YILLIK_UCRET, tl } from '@/lib/abonelikPlanlari'

const SITE = 'https://www.klup360.com'

/** bag: cevaptaki {bag} yerine konacak bağlantı (sayfada link, yapısal veride düz metin). */
export type Soru = { soru: string; cevap: string; bag?: { href: string; metin: string } }

export const SORULAR: Soru[] = [
  { soru: 'Denetçi verilerimizi değiştirebilir mi?', cevap: 'Hayır. Denetçi kayıtlarınızı yalnızca görüntüler; değiştiremez, silemez. Gönderdiğiniz dosyayı onaylar ya da notla size iade eder.' },
  { soru: 'Başka bir okul kayıtlarımızı görebilir mi?', cevap: 'Hayır. Her kurumun verisi ayrı tutulur ve yalnızca o kurumun kullanıcılarına açılır. Bağlantı şifrelidir; kayıtlar altyapı sağlayıcımızın sunucularında, kurumunuza ayrılmış alanda tutulur.' },
  { soru: 'Bordro neye göre hesaplanıyor?', cevap: 'Puantajdaki ders saatlerinden; MEB katsayıları, güncel SGK oranları ve gelir vergisi dilimleriyle. Vergi dilimlerini ayarlardan kendiniz de güncelleyebilirsiniz.' },
  { soru: 'Hesaplar hangi kurallara göre yapılıyor?', cevap: 'Aidat, puantaj ve ücret hesapları {bag}’ne göre yapılır; SGK ve vergi tarafında yılın güncel oranları kullanılır.', bag: { href: '/rehber/cocuk-kulubu-yonetmeligi', metin: 'MEB Çocuk Kulüpleri Yönergesi' } },
  { soru: 'Muhasebecimize ayrıca bordro göndermemiz gerekir mi?', cevap: 'Bordroyu ayrıca hazırlamanız gerekmez: bordro puantajdaki saatlerden hesaplanır, muhtasar XML dosyası da bordrodan üretilir. Beyan sorumluluğu kurumunuzdadır; muhasebeciniz dosyayı yüklemeden önce kontrol edebilir.' },
  { soru: 'Mevcut öğrenci ve personel listemizi aktarabilir miyiz?', cevap: 'Evet. Öğrenci ve personel listelerinizi Excel’den aktarabilir ya da tek tek ekleyebilirsiniz.' },
  { soru: 'Bilgisayara program kurmamız gerekiyor mu?', cevap: 'Hayır. Klüp360 tarayıcıda çalışır; okuldaki bilgisayardan da telefonunuzdan da açılır.' },
  { soru: 'Fiyat öğrenci sayısına göre değişir mi?', cevap: 'Hayır. Öğrenci, personel ve sınıf sayısında sınır yoktur; ücret kurum başına sabittir.' },
  { soru: 'Deneme bitince ne olur?', cevap: `${DENEME_GUN} günlük deneme bitince aylık ₺${tl(AYLIK_UCRET)} ya da yıllık ₺${tl(YILLIK_UCRET)} ile devam edersiniz. Abone olmazsanız girdiğiniz kayıtlar silinmez; abone olduğunuzda kaldığınız yerden sürer.` },
  { soru: 'Fatura alabilir miyiz?', cevap: 'Her ödemede faturanız e-posta adresinize gelir. Geçmiş faturalara Ayarlar › Abonelik’ten de ulaşırsınız.' },
  { soru: 'Nasıl iptal ederiz?', cevap: 'Ayarlar › Abonelik’teki müşteri portalından, kimseyle görüşmeden. İptal ettiğinizde ödediğiniz dönemin sonuna kadar kullanmaya devam edersiniz; iptal ücreti yoktur. Ödemeden sonraki 14 gün içinde iptal ederseniz ücretin tamamı iade edilir.' },
  { soru: 'Takılırsak yardım alabilir miyiz?', cevap: 'Evet. Kurulumda ve günlük kullanımda destek veriyoruz; sorunuzu iletişim sayfasından ya da destek@klup360.com adresinden yazabilirsiniz.' },
  { soru: 'Birden fazla okul için indirim var mı?', cevap: 'Evet. Aynı kurum ya da ilçe adına birden fazla okul kaydedilecekse okul sayısına göre indirimli fiyat sunuyoruz. Teklif için bize yazın.' },
]

/** Tanıtım sayfasına özel JSON-LD: kurum, yazılım (fiyatlar sabitlerden) ve SSS. */
export const TANITIM_YAPISAL_VERI = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE}/#kurum`, name: 'Klüp360', url: SITE, logo: `${SITE}/apple-icon.png` },
    {
      '@type': 'SoftwareApplication',
      name: 'Klüp360',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'tr',
      url: `${SITE}/tanitim`,
      description: 'MEB çocuk kulüpleri için aidat, puantaj, bordro, muhtasar XML ve denetim dosyası tek programda.',
      publisher: { '@id': `${SITE}/#kurum` },
      offers: [
        { '@type': 'Offer', name: 'Aylık', price: String(AYLIK_UCRET), priceCurrency: 'TRY' },
        { '@type': 'Offer', name: 'Yıllık', price: String(YILLIK_UCRET), priceCurrency: 'TRY' },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: SORULAR.map(({ soru, cevap, bag }) => ({
        '@type': 'Question', name: soru, acceptedAnswer: { '@type': 'Answer', text: bag ? cevap.replace('{bag}', bag.metin) : cevap },
      })),
    },
  ],
}
