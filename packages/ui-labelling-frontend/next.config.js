/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:4000/api/:path*`,
      },
      {
        source: '/yolo/:path*',
        destination: `http://localhost:4420/:path*`
      }
    ]
  },
}
