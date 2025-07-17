/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  experimental: {
    serverActions: {},
    /**
     * This allows you to access your development server from other devices
     * on your local network, like a phone for testing.
     * Add the origins you want to allow.
     */
    allowedDevOrigins: [
        "http://localhost:3000", // The default
        "http://123.231.16.208:3000" // The origin from your warning
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;