/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Impede o webpack de empacotar módulos Node.js que acessam o filesystem
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "sharp"],
  },
}

module.exports = nextConfig
