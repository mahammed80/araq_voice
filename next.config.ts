import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  //output: 'standalone', // Recommended for production deployments
  webpack: (config, { isServer }) => {
    // Ensure server-side modules are properly resolved
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  serverExternalPackages: ['groq-sdk', 'node-fetch', 'formdata-node', 'agentkeepalive'],
};

export default nextConfig;
