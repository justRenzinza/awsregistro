// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 👇 NÃO roda ESLint durante o build de produção
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
