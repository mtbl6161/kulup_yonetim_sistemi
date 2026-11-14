import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Geliştirmede tarayıcı konsolu .next/dev/logs'a yazılınca sunucu bunu değişiklik sayıp
  // sayfayı yeniden yüklüyor, yeni yükleme yeni günlük yazıyordu (sonsuz döngü). Aktarma kapalı.
  logging: { browserToTerminal: false },
  // Eski kullanıcı yönetimi adresi artık yönetim konsolunun Kullanıcılar sekmesinde
  async redirects() {
    return [{ source: '/kullanici-yonetimi', destination: '/yonetim?sekme=kullanicilar', permanent: true }]
  },
};

export default nextConfig;
