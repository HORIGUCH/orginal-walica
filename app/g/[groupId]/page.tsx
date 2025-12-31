import ExpenseClient from "./ExpenseClient";

export default async function GroupPage({
  params,
}: {
  params: { groupId: string };
}) {
  // Server Component側では「groupIdをクライアントに渡す」だけでOK
  // DBアクセスはクライアントでやる（匿名MVPなので割り切る）
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">割り勘</h1>
        <p className="text-sm text-muted-foreground">Group: {params.groupId}</p>
      </header>

      <ExpenseClient groupId={params.groupId} />
    </main>
  );
}
