import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ↓↓↓ この <Database> が重要だ！ ↓↓↓
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const createGroupClient = (groupId: string) => {
  // ↓↓↓ ここにも <Database> が必要だ！ ↓↓↓
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "x-group-id": groupId,
      },
    },
  });
};
