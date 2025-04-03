/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  devServer: {
    allowedDevOrigins: ['http://192.168.1.169', 'http://localhost'],
  },
};

module.exports = nextConfig;
