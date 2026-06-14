import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/session";

// Next 16 renamed the `middleware.ts` convention to `proxy.ts`. Behaviour is
// unchanged — this runs on every matched request before route handling.
export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

// Skip static assets, image optimisation, the favicon, the manifest,
// the service worker, and the PWA icons.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
