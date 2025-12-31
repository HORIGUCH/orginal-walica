import { Database } from "@/types/supabase";

type Member = Database["public"]["Tables"]["members"]["Row"];
type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseSplit = Database["public"]["Tables"]["expense_splits"]["Row"];

// 支出と内訳データを受け取る
type ExpenseData = Expense & {
  expense_splits: ExpenseSplit[];
};

export interface Transaction {
  from: string; // 払う人(ID)
  to: string; // 受け取る人(ID)
  amount: number;
}

// 貸し借り計算のメインロジック
export const calculateSettlements = (
  members: Member[],
  expenses: ExpenseData[]
): Transaction[] => {
  // 1. 各メンバーの収支バランスを計算
  // 正の値 = 受け取る権利 (Creditor)
  // 負の値 = 払う義務 (Debtor)
  const balances: Record<string, number> = {};

  // 初期化
  members.forEach((m) => (balances[m.id] = 0));

  expenses.forEach((exp) => {
    // 立て替えた人（プラス）
    const payerId = exp.paid_by;
    if (balances[payerId] !== undefined) {
      balances[payerId] += exp.amount;
    }

    // 消費した人（マイナス）
    exp.expense_splits.forEach((split) => {
      const consumerId = split.member_id;
      if (balances[consumerId] !== undefined) {
        balances[consumerId] -= split.amount_owed;
      }
    });
  });

  // 2. 債務者（払う人）と債権者（もらう人）に分ける
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([id, amount]) => {
    // 誤差対策（0.01円以下のズレは無視）
    if (amount < -1) debtors.push({ id, amount });
    if (amount > 1) creditors.push({ id, amount });
  });

  // 金額の大きい順にソート（効率的に相殺するため）
  debtors.sort((a, b) => a.amount - b.amount); // 昇順（マイナスの大きい順）
  creditors.sort((a, b) => b.amount - a.amount); // 降順（プラスの大きい順）

  const transactions: Transaction[] = [];

  // 3. グリーディ法で相殺していく
  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // 相殺できる金額（借金の絶対値 と 受取額 の小さい方）
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    // 清算プランに追加
    transactions.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(amount),
    });

    // 残高を減らす
    debtor.amount += amount;
    creditor.amount -= amount;

    // 完済したら次の人へ
    if (Math.abs(debtor.amount) < 1) i++;
    if (creditor.amount < 1) j++;
  }

  return transactions;
};
