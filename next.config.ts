import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Enable static export for Electron builds
  // (disabled by default; enable with NEXT_STATIC_EXPORT=true)
  ...(process.env.NEXT_STATIC_EXPORT === 'true' ? { output: 'export' } : {}),
};

export default nextConfig;
