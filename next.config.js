/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  experimental: {
    serverActions: {},
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = {
  ...nextConfig,
  async rewrites() {
    return [
      {
        source: '/api/incomedata',
        destination: '/api/opcua',
      },
    ];
  },
};