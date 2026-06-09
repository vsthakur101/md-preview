import type { NextConfig } from "next";

/**
 * Baseline security response headers applied to every route.
 *
 * Note: a Content-Security-Policy is intentionally NOT set here yet. A correct
 * CSP for this app needs a per-request nonce for Next.js's inline hydration
 * bootstrap and an allowance for react-syntax-highlighter's inline `style`
 * attributes; that belongs in middleware and must be verified against a running
 * build before shipping. See docs/IMPROVEMENT_PLAN.md §2.3.
 */
const securityHeaders = [
  // Force HTTPS for two years, including subdomains. Only meaningful over TLS.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Disallow MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow being embedded in frames (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop access to powerful features the app never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
