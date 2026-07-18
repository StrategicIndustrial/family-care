import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chronicle's "Add medical note" attachment upload sends the file through
  // a Server Action as multipart FormData (rather than a signed-URL direct
  // upload) — needs headroom above the 1 MB default for the 20 MB cap.
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
