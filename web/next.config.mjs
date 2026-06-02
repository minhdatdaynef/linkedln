/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep pdf-parse and mammoth as external Node packages (not bundled by webpack)
    // so they resolve correctly in serverless API routes (Next.js 14 syntax)
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
};
export default nextConfig;
