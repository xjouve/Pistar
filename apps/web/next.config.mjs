import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config, { dev }) => {
    // Workaround for builds on filesystems without symlink support
    // (e.g. exFAT external drives on Windows). Webpack's persistent cache
    // and resolver call readlink on every file, which fails on exFAT.
    // CI runs on ext4 and is unaffected.
    config.resolve.symlinks = false;
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
