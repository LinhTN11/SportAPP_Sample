/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip ESLint during build to prevent deploy failures
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Allow images from the backend and Render domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.onrender.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    unoptimized: true,
  },

  // Standalone output for optimized Render deployment
  output: 'standalone',
};

export default nextConfig;
