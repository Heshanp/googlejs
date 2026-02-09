/** @type {import('next').NextConfig} */

const withPWA = (config) => config;

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'justsell-images-*.s3.ap-southeast-2.amazonaws.com',
      },
    ],
  },
  // PWA Configuration
  // This part would be active if next-pwa was installed
  // pwa: {
  //   dest: 'public',
  //   register: true,
  //   skipWaiting: true,
  //   disable: process.env.NODE_ENV === 'development',
  //   runtimeCaching: [
  //     {
  //       urlPattern: /^https?.*/,
  //       handler: 'NetworkFirst',
  //       options: {
  //         cacheName: 'offlineCache',
  //         expiration: {
  //           maxEntries: 200,
  //         },
  //       },
  //     },
  //   ],
  // },
}

export default withPWA(nextConfig);
