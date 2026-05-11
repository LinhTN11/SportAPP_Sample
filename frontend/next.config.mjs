/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // Disable image optimization on free tier to save resources
    unoptimized: process.env.NODE_ENV === 'production',
  },

  // Output standalone build for smaller deployment size
  output: 'standalone',
};

export default nextConfig;
