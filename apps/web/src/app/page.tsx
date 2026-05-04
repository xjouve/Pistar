import { redirect } from "next/navigation";
import { routing } from "@/lib/i18n/routing";

// Catch the bare `/` route in case middleware misses it (e.g. during static
// generation). next-intl middleware normally rewrites `/` → `/en` already.
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
