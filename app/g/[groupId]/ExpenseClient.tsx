"use client";

import * as React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ExpenseModal } from "@/components/ExpenseModal";
import { Button } from "@/components/ui/button";

type Member = { id: string; name: string };

export default function ExpenseClient({ groupId }: { groupId: string }) {
  const supabase = React.useMemo(
    () => createSupabaseBrowserClient(groupId),
    [groupId]
  );

  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function fetchMembers() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("members")
      .select("id,name")
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setMembers([]);
    } else {
      setMembers(data ?? []);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">メンバー</h2>
        <Button
          onClick={() => setOpen(true)}
          disabled={loading || members.length === 0}
        >
          支出を追加
        </Button>
      </div>

      {error && (
        <div className="rounded-md border p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">読み込み中...</div>
      ) : members.length === 0 ? (
        <div className="rounded-md border p-4 text-sm">
          メンバーが0人だ。先に members を追加しろ（下にSQL置いた）。
        </div>
      ) : (
        <div className="grid gap-2">
          {members.map((m) => (
            <div key={m.id} className="rounded-md border p-3">
              {m.name}
            </div>
          ))}
        </div>
      )}

      <ExpenseModal
        open={open}
        onOpenChange={setOpen}
        groupId={groupId}
        members={members}
        currency="JPY"
        onCreated={() => {
          // まずは「支出作れた」確認だけ。次に expenses一覧もここで再取得する。
          fetchMembers();
        }}
      />
    </section>
  );
}
