import Link from 'next/link'
import { AYLIK_UCRET, DENEME_GUN, YILLIK_AYLIK_KARSILIGI, YILLIK_LISTE_UCRETI, YILLIK_TASARRUF, YILLIK_UCRET, tl } from '@/lib/abonelikPlanlari'

// Fiyatlandırma: iki ödeme seçeneği yan yana bir cetvelde, pakete dahil olanlar fihrist, sorular açık cevaplı.

const DAHIL = [
  ['Öğrenci ve sınıflar', 'Kayıt, kontenjan, iş gününe göre otomatik aidat'],
  ['Personel', 'Görev, SGK durumu, IBAN ve iletişim bilgileri'],
  ['Ders programı ve sınıf defteri', 'Yoklama, ders saatlerinin puantaja aktarımı'],
  ['Puantaj ve bordro', 'MEB katsayıları, SGK ve vergi; ücret zarfı ve e-posta'],
  ['Muhtasar beyannamesi', 'e-Beyanname’ye yüklenecek MUHSGK_22 XML dosyası'],
  ['Aidat ve tahsilat', 'Banka ekstresi eşleştirme, geciken ödemeler, taksitler'],
  ['İşletme defteri ve bilanço', 'Gelir-gider, resmî kapak sayfası, ücret dağıtım bilançosu'],
  ['Denetim dosyası', 'İl evrak listesi, otomatik üretilen belgeler, denetçi onayı'],
  ['Okul Aile Birliği', 'Bağış ve aidat tahsilatı, birliğin işletme defteri'],
  ['Hatırlatmalar ve raporlar', 'Eksik puantaj, yaklaşan beyanname günü, PDF raporlar'],
]

const SORULAR = [
  ['Öğrenci ya da personel sayısına göre fiyat değişir mi?', 'Hayır. Öğrenci, personel ve sınıf sayısında sınır yoktur; ücret kurum başına sabittir.'],
  ['Nasıl iptal ederim?', 'Ayarlar › Abonelik’ten, kimseyle görüşmeden. İptal ettiğinizde ödediğiniz dönemin sonuna kadar kullanmaya devam edersiniz; cayma bedeli yoktur.'],
  ['Deneme bitince ne olur?', `${DENEME_GUN} günlük deneme için kart bilgisi istenmez. Deneme bitince abone olmazsanız girdiğiniz kayıtlar silinmez; abone olduğunuzda kaldığınız yerden sürer.`],
  ['Fatura alabilir miyim?', 'Her ödemede faturanız e-posta adresinize gelir. Geçmiş faturalara Ayarlar › Abonelik’ten de ulaşırsınız.'],
  ['Verilerimiz nerede saklanıyor?', 'Şifrelenmiş olarak bulutta. Her kurumun verisi ayrı tutulur; başka bir okul sizin kayıtlarınızı göremez.'],
]

export default function FiyatlandirmaContent() {
  return (
    <div className="fp">
      <style>{CSS}</style>

      {/* Fiyat cetveli */}
      <table className="fp-cetvel">
        <caption className="fp-gizli">Aylık ve yıllık ödeme karşılaştırması</caption>
        <thead>
          <tr>
            <th scope="col"><span className="fp-gizli">Kalem</span></th>
            <th scope="col">Aylık ödeme</th>
            <th scope="col">Yıllık ödeme</th>
          </tr>
        </thead>
        <tbody>
          <tr className="fp-ucret">
            <th scope="row">Ücret</th>
            <td><strong>₺{tl(AYLIK_UCRET)}</strong><span> / ay</span></td>
            <td><strong>₺{tl(YILLIK_UCRET)}</strong><span> / yıl</span></td>
          </tr>
          <tr>
            <th scope="row">Aylık karşılığı</th>
            <td>₺{tl(AYLIK_UCRET)}</td>
            <td>₺{tl(YILLIK_AYLIK_KARSILIGI)}</td>
          </tr>
          <tr>
            <th scope="row">12 ayda toplam</th>
            <td>₺{tl(YILLIK_LISTE_UCRETI)}</td>
            <td>₺{tl(YILLIK_UCRET)}{YILLIK_TASARRUF > 0 && <em>, ₺{tl(YILLIK_TASARRUF)} daha az</em>}</td>
          </tr>
          <tr>
            <th scope="row">Yenileme</th>
            <td>Her ay, otomatik</td>
            <td>Her yıl, otomatik</td>
          </tr>
          <tr>
            <th scope="row">İptal</th>
            <td colSpan={2}>İstediğiniz an; ödediğiniz dönemin sonuna kadar kullanırsınız</td>
          </tr>
        </tbody>
      </table>

      <div className="fp-eylem">
        <Link href="/signup" className="pub-btn pub-btn-primary pub-btn-lg">{DENEME_GUN} gün ücretsiz deneyin</Link>
        <p>Kart bilgisi istenmez. Ödeme sıklığını deneme bitince seçersiniz.</p>
      </div>

      {/* Pakete dahil olanlar */}
      <h2 className="fp-h2">İki seçenekte de pakete dahil olanlar</h2>
      <dl className="fp-dahil">
        {DAHIL.map(([ad, ne]) => <div key={ad}><dt>{ad}</dt><dd>{ne}</dd></div>)}
      </dl>

      {/* Sorular */}
      <h2 className="fp-h2">Ödemeyle ilgili sorular</h2>
      <dl className="fp-sorular">
        {SORULAR.map(([s, c]) => <div key={s}><dt>{s}</dt><dd>{c}</dd></div>)}
      </dl>
    </div>
  )
}

const CSS = `
.fp{max-width:1120px}
.fp-gizli{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.fp-cetvel{width:100%;max-width:820px;border-collapse:collapse;font-variant-numeric:tabular-nums;border-top:2px solid var(--tx)}
.fp-cetvel th,.fp-cetvel td{text-align:left;padding:14px 16px 14px 0;border-bottom:1px solid var(--cizgi);vertical-align:baseline}
.fp-cetvel thead th{font-family:var(--baslik);font-size:19px;font-weight:700;color:var(--tx);padding-top:18px}
.fp-cetvel tbody th{font-weight:500;color:var(--tx2);width:30%}
.fp-cetvel td{color:var(--tx);width:35%}
.fp-ucret strong{font-family:var(--baslik);font-size:clamp(30px,4vw,40px);font-weight:700;letter-spacing:-.02em}
.fp-ucret span{color:var(--tx3)}
.fp-cetvel em{font-style:normal;color:var(--g-d);font-weight:600}
.fp-eylem{display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px;margin-top:28px}
.fp-eylem p{margin:0;font-size:14.5px;color:var(--tx3);max-width:40ch}
.fp-h2{font-family:var(--baslik);font-size:clamp(26px,3.2vw,34px);font-weight:700;letter-spacing:-.012em;line-height:1.15;margin:clamp(56px,7vw,88px) 0 24px;max-width:24ch}
.fp-dahil{display:grid;grid-template-columns:1fr 1fr;gap:0 56px;border-top:2px solid var(--tx);margin:0}
.fp-dahil>div{display:grid;grid-template-columns:minmax(0,max-content) 1fr;align-items:baseline;gap:0 10px;padding:14px 0;border-bottom:1px solid var(--cizgi)}
.fp-dahil dt{font-weight:600;display:flex;align-items:baseline;gap:10px;white-space:nowrap}
.fp-dahil dt::after{content:"";flex:1;min-width:20px;border-bottom:2px dotted var(--cizgi);transform:translateY(-4px)}
.fp-dahil dd{margin:0;color:var(--tx2);font-size:15.5px}
.fp-sorular{display:grid;grid-template-columns:1fr 1fr;gap:28px 56px;margin:0}
.fp-sorular dt{font-family:var(--baslik);font-weight:700;font-size:19px;line-height:1.3}
.fp-sorular dd{margin:8px 0 0;color:var(--tx2);max-width:56ch}
@media (max-width:760px){
  .fp-cetvel tbody th{width:auto;font-size:15px}
  .fp-cetvel thead th{font-size:16px}
  .fp-ucret strong{font-size:25px}
  .fp-ucret span{display:block;font-size:14px}
  .fp-cetvel th,.fp-cetvel td{padding-right:10px}
  .fp-dahil,.fp-sorular{grid-template-columns:1fr}
  .fp-dahil>div{grid-template-columns:1fr}
  .fp-dahil dt::after{display:none}
  .fp-dahil dd{margin-top:2px}
}
`
