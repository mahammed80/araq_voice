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
        electron: false,
      };
    } else {
      // For client-side, also exclude electron
      config.resolve.fallback = {
        ...config.resolve.fallback,
        electron: false,
      };
    }
    return config;
  },
  serverExternalPackages: [
    'groq-sdk',
    'node-fetch',
    'formdata-node',
    'agentkeepalive',
    '@wppconnect-team/wppconnect',
    'got',
    'puppeteer-core',
  ],
};

export default nextConfig;
