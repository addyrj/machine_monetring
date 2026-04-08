// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,

//   // Fix: Use string array, not objects with source/destination
//   allowedDevOrigins: [
//     'localhost:3000',
//     '172.18.240.1:3000',
//   ],

//   async rewrites() {
//     return [
//       {
//         source: "/api/:path*",
//         destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
//       },
//     ];
//   },
// };

// export default nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  allowedDevOrigins: [
    'localhost:3000',
    '192.168.1.67:3000',     // Your computer's IP
    '172.18.240.1:3000',
    '*.local',
  ],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/:path*`,
      },
    ];
  },
};

export default nextConfig;