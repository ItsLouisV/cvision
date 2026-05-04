import Constants from 'expo-constants';

let API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

// Automatically use the computer's IP address instead of localhost during development
if (__DEV__ && API_URL && (API_URL.includes("localhost") || API_URL.includes("127.0.0.1"))) {
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const localhostIP = debuggerHost.split(':')[0];
    API_URL = API_URL.replace("localhost", localhostIP).replace("127.0.0.1", localhostIP);
  }
}

export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  API_URL: API_URL,
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_KEY || !ENV.API_URL) {
  throw new Error("Missing environment variables");
}
