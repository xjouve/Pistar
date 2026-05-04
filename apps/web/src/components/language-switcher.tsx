"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/routing";
import { routing } from "@/lib/i18n/routing";
import { useTransition } from "react";

export function LanguageSwitcher() {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("label")}</span>
      <select
        aria-label={t("label")}
        defaultValue={locale}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value as (typeof routing.locales)[number];
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  );
}
