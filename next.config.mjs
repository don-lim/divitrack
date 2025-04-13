/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['localhost'],
  },
  poweredByHeader: false,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['yahoo-finance2'],
  }
};

export default nextConfig; 