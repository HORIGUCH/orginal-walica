"use client";

import { useState, useEffect } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { createGroupClient } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Member = Database["public"]["Tables"]["members"]["Row"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: Member[];
  onSuccess: () => void;
}

export default function ExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitType, setSplitType] = useState<"EQUAL" | "EXACT">("EQUAL");

  // 割り勘の状態管理: { [memberId]: amount }
  const [splits, setSplits] = useState<Record<string, number>>({});
  // 均等割りの対象者選択: { [memberId]: boolean }
  const [selectedMembers, setSelectedMembers] = useState<
    Record<string, boolean>
  >({});

  // 初期化
  useEffect(() => {
    if (isOpen && members.length > 0) {
      setPaidBy(members[0].id);
      // デフォルトで全員選択
      const initialSelected: Record<string, boolean> = {};
      members.forEach((m) => (initialSelected[m.id] = true));
      setSelectedMembers(initialSelected);
    }
  }, [isOpen, members]);

  // 金額変更時の自動計算 (均等割りモード時)
  useEffect(() => {
    if (splitType === "EQUAL") {
      recalculateEqualSplit();
    }
  }, [amount, selectedMembers, splitType]);

  const recalculateEqualSplit = () => {
    const totalAmount = parseFloat(amount) || 0;
    const targets = members.filter((m) => selectedMembers[m.id]);
    if (targets.length === 0) {
      setSplits({});
      return;
    }

    const perPerson = Math.floor(totalAmount / targets.length);
    const remainder = totalAmount % targets.length;

    const newSplits: Record<string, number> = {};
    members.forEach((m) => {
      if (selectedMembers[m.id]) {
        newSplits[m.id] = perPerson;
      } else {
        newSplits[m.id] = 0;
      }
    });

    // 端数は最初の人(便宜上)に乗せる ※厳密なロジックは後で調整可
    if (remainder > 0 && targets.length > 0) {
      newSplits[targets[0].id] += remainder;
    }
    setSplits(newSplits);
  };

  const handleSave = async () => {
    if (!title || !amount || !paidBy) return;
    setLoading(true);

    try {
      const supabase = createGroupClient(groupId);
      const totalAmount = parseFloat(amount);

      // 1. 親レコード作成 (Expenses)
      const { data: expense, error: expError } = await (
        supabase.from("expenses") as any
      )
        .insert({
          group_id: groupId,
          paid_by: paidBy,
          title: title,
          amount: totalAmount,
          split_type: splitType,
        })
        .select()
        .single();

      if (expError) throw expError;

      // 2. 子レコード作成 (ExpenseSplits)
      const splitRecords = members
        .map((m) => ({
          expense_id: expense.id,
          member_id: m.id,
          amount_owed: splits[m.id] || 0,
        }))
        .filter((r) => r.amount_owed > 0); // 0円の人は登録しない方針

      if (splitRecords.length > 0) {
        const { error: splitError } = await (
          supabase.from("expense_splits") as any
        ).insert(splitRecords);

        if (splitError) throw splitError;
      }

      onSuccess();
      onClose();
      // フォームリセット
      setTitle("");
      setAmount("");
    } catch (e: any) {
      alert("エラー: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // バリデーション: 合計が一致しているか
  const currentTotal = Object.values(splits).reduce((a, b) => a + b, 0);
  const inputAmount = parseFloat(amount) || 0;
  const isValid = Math.abs(currentTotal - inputAmount) < 1; // 誤差許容

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">支出を記録</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="例: ランチ代、タクシー"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金額 (円)
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  誰が払った？
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 割り勘設定 */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex gap-2 mb-4 bg-white p-1 rounded-lg border">
              <button
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  splitType === "EQUAL"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                onClick={() => setSplitType("EQUAL")}
              >
                均等割り
              </button>
              <button
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  splitType === "EXACT"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                onClick={() => setSplitType("EXACT")}
              >
                個別入力
              </button>
            </div>

            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {splitType === "EQUAL" && (
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded"
                        checked={!!selectedMembers[m.id]}
                        onChange={(e) =>
                          setSelectedMembers({
                            ...selectedMembers,
                            [m.id]: e.target.checked,
                          })
                        }
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {m.name}
                    </span>
                  </div>

                  {splitType === "EQUAL" ? (
                    <span className="text-sm text-gray-500 font-mono">
                      ¥{splits[m.id]?.toLocaleString() || 0}
                    </span>
                  ) : (
                    <input
                      type="number"
                      className="w-24 text-right rounded border border-gray-300 px-2 py-1 text-sm font-mono"
                      value={splits[m.id] || ""}
                      onChange={(e) =>
                        setSplits({
                          ...splits,
                          [m.id]: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            {/* バリデーションエラー表示 */}
            {splitType === "EXACT" && !isValid && (
              <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="w-4 h-4" />
                <span>
                  合計が合いません (残り: {inputAmount - currentTotal}円)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleSave}
            disabled={loading || !title || !amount || !isValid}
            className={`w-full flex justify-center items-center gap-2 py-3 rounded-lg font-bold text-white shadow-sm transition-all
              ${
                loading || !title || !amount || !isValid
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]"
              }`}
          >
            {loading ? "保存中..." : "支出を記録する"}
          </button>
        </div>
      </div>
    </div>
  );
}
