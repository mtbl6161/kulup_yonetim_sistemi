import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Eski kullanıcı yönetimi adresi artık yönetim konsolunun Kullanıcılar sekmesinde
  async redirects() {
    return [{ source: '/kullanici-yonetimi', destination: '/yonetim?sekme=kullanicilar', permanent: true }]
  },
};

export default nextConfig;
