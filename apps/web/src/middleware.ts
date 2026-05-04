import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Run middleware on all paths except API routes, _next assets, and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
