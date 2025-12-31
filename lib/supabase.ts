import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 通常のクライアント（グループ作成用）
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// 特定のグループ用クライアント（x-group-idヘッダー付与）
// これがないとRLS（セキュリティ）に弾かれてデータが見えない
export const createGroupClient = (groupId: string) => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "x-group-id": groupId,
      },
    },
  });
};
