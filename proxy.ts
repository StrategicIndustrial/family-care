import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/session";

// Next 16 renamed the `middleware.ts` convention to `proxy.ts`. Behaviour is
// unchanged — this runs on every matched request before route handling.
export async function proxy(request: NextRequest) {
  const response = await updateSupabaseSession(request);
  // Expose pathname to Server Components — Next doesn't surface this otherwise.
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

// Skip static assets, image optimisation, the favicon, the manifest,
// the service worker, and the PWA icons.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
