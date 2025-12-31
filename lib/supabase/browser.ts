import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient(groupId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(url, anonKey, {
    global: {
      headers: {
        "x-group-id": groupId, // これがRLS通す鍵
      },
    },
  });
}
