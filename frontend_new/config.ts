export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_KEY) {
  throw new Error('Missing environment variables');
}