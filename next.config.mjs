/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint is not configured in this project; don't block production builds on it.
  // TypeScript type-checking still runs and will fail the build on type errors.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
