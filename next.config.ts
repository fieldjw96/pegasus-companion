import type { NextConfig } from "next";

// Cloudflare builds set CF_EXPORT=1 to emit a static site into ./out.
// Vercel builds leave it unset and behave exactly as before.
const cloudflare = process.env.CF_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(cloudflare && { output: "export" as const, images: { unoptimized: true } }),
};

export default nextConfig;
