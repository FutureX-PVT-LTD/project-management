/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',
  transpilePackages: ['@futurex/shared'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_URL || 'http://localhost:4000'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
