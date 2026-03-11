export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? "",
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_KEY || !ENV.API_URL) {
  throw new Error("Missing environment variables");
}
