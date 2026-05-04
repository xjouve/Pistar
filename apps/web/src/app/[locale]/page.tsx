import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="bg-background text-foreground min-h-dvh">
      <header className="container flex items-center justify-between py-6">
        <span className="font-display text-xl font-semibold tracking-tight">pistar</span>
        <LanguageSwitcher />
      </header>

      <section className="container flex flex-col items-start gap-6 py-24 md:py-32">
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
          {t("tagline")}
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          {t("headline")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed md:text-xl">
          {t("subhead")}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-medium transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {t("primaryCta")}
          </button>
          <button
            type="button"
            className="border-input text-foreground hover:bg-secondary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-11 items-center justify-center rounded-lg border bg-transparent px-6 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {t("secondaryCta")}
          </button>
        </div>

        <ul className="text-muted-foreground mt-12 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <li className="border-border border-l pl-4">{t("trust.languages")}</li>
          <li className="border-border border-l pl-4">{t("trust.coaches")}</li>
          <li className="border-border border-l pl-4">{t("trust.delivery")}</li>
        </ul>
      </section>
    </main>
  );
}
