import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="container flex items-center justify-between py-6">
        <span className="font-display text-xl font-semibold tracking-tight">pistar</span>
        <LanguageSwitcher />
      </header>

      <section className="container flex flex-col items-start gap-6 py-24 md:py-32">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("tagline")}
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          {t("headline")}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          {t("subhead")}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("primaryCta")}
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-transparent px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("secondaryCta")}
          </button>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-4 text-sm text-muted-foreground md:grid-cols-3">
          <li className="border-l border-border pl-4">{t("trust.languages")}</li>
          <li className="border-l border-border pl-4">{t("trust.coaches")}</li>
          <li className="border-l border-border pl-4">{t("trust.delivery")}</li>
        </ul>
      </section>
    </main>
  );
}
