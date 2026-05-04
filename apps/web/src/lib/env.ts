import { z } from "zod";

// Server-only env. Never import this from a Client Component.
// We split required vs. optional so MVP-stage code can run without (e.g.)
// Polar or Wise credentials wired up.

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // --- Required at build time ---
  DATABASE_URL: z.string().url(),

  // --- Auth ---
  AUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),

  // --- Polar ---
  POLAR_ACCESS_TOKEN: z.string().optional(),
  POLAR_WEBHOOK_SECRET: z.string().optional(),
  POLAR_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  POLAR_PRODUCT_SINGLE_RUN: z.string().optional(),
  POLAR_PRODUCT_SESSION_PACK: z.string().optional(),

  // --- Wise ---
  WISE_API_TOKEN: z.string().optional(),
  WISE_PROFILE_ID: z.string().optional(),
  WISE_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  WISE_WEBHOOK_PUBLIC_KEY: z.string().optional(),

  // --- Mux ---
  MUX_TOKEN_ID: z.string().optional(),
  MUX_TOKEN_SECRET: z.string().optional(),
  MUX_WEBHOOK_SECRET: z.string().optional(),
  MUX_SIGNING_KEY_ID: z.string().optional(),
  MUX_SIGNING_KEY_PRIVATE: z.string().optional(),

  // --- Storage ---
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),

  // --- Observability ---
  SENTRY_DSN: z.string().url().optional(),

  // --- App ---
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  DEFAULT_LOCALE: z.string().default("en"),
  SUPPORTED_LOCALES: z.string().default("en,de,fr"),
});

// During `next build` the linter runs without a real DATABASE_URL. Allow
// validation to be lazy: only throw when env is actually accessed at runtime.
let cached: z.infer<typeof envSchema> | undefined;

export function env() {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    throw new Error(
      "Invalid environment variables:\n" + JSON.stringify(formatted, null, 2),
    );
  }
  cached = parsed.data;
  return cached;
}

export type Env = ReturnType<typeof env>;
