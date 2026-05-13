import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'puppeteer',
    'puppeteer-core',
    '@sparticuz/chromium',
    'archiver',
  ],
  // Vercel/Next.js output-file-tracing misses the chromium binary inside
  // @sparticuz/chromium/bin. Force it to be included for the PDF route so
  // the function has the Chromium tarball at runtime.
  outputFileTracingIncludes: {
    '/api/export/pdf': [
      './node_modules/@sparticuz/chromium/bin/**/*',
    ],
  },
};

export default nextConfig;
