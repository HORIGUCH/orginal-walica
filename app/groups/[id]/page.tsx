"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createGroupClient } from "@/lib/supabase";
import { Database } from "@/types/supabase";
import ExpenseModal from "@/components/ExpenseModal";
import { Plus } from "lucide-react";
import { calculateSettlements, Transaction } from "@/lib/calculation";
import { ArrowRight, Wallet } from "lucide-react";

// 型定義
type Group = Database["public"]["Tables"]["groups"]["Row"];
type Member = Database["public"]["Tables"]["members"]["Row"];
// 支出データに「支払った人の名前」と「内訳」を結合した型
type ExpenseWithMember = Database["public"]["Tables"]["expenses"]["Row"] & {
  members: { name: string } | null;
  expense_splits: Database["public"]["Tables"]["expense_splits"]["Row"][];
};

export default function GroupPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // データを読み込む関数 (ここを async にするのが重要！)
  const fetchGroupData = useCallback(async () => {
    if (!groupId) return;

    const supabase = createGroupClient(groupId);

    // 1. グループ情報の取得
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (groupError) {
      console.error("Error loading group:", groupError);
    } else {
      setGroup(groupData);
    }

    // 2. メンバー一覧の取得
    const { data: membersData } = await supabase
      .from("members")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true } as any);

    if (membersData) setMembers(membersData);

    // 3. 支出一覧を取得 (支払った人の名前も結合)
    const { data: expensesData, error: expError } = await supabase
      .from("expenses")
      .select(
        `
        *,
        members:paid_by ( name ),
        expense_splits ( * )
      `
      )
      .eq("group_id", groupId)
      .order("date", { ascending: false });

    if (expError) {
      console.error("支出取得エラー:", expError);
    } else {
      // 型アサーションで解決
      setExpenses(expensesData as unknown as ExpenseWithMember[]);
    }

    setLoading(false);
  }, [groupId]);

  // 初回ロード
  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  // メンバー追加処理
  const addMember = async () => {
    if (!newMemberName.trim()) return;

    const supabase = createGroupClient(groupId);

    const { error } = await (supabase.from("members") as any).insert({
      group_id: groupId,
      name: newMemberName,
    });

    if (error) {
      alert("メンバー追加エラー: " + error.message);
    } else {
      setNewMemberName("");
      // リストを再取得して更新
      fetchGroupData();
    }
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;
  if (!group)
    return (
      <div className="p-8 text-center text-red-500">
        グループが見つかりません
      </div>
    );

  // 清算プランの計算
  const settlements = calculateSettlements(members, expenses);

  // IDから名前を引くためのヘルパー
  const getName = (id: string) =>
    members.find((m) => m.id === id)?.name || "不明";

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-xs text-gray-400 mt-1 font-mono">ID: {group.id}</p>
        </div>

        {/* メンバー管理 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            参加メンバー
          </h2>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="名前を入力 (例: 田中)"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
            />
            <button
              onClick={addMember}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              追加
            </button>
          </div>

          <div className="space-y-2">
            {members.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                まだメンバーがいません
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-700">
                    {member.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 支出リスト (ここが今回の修正箇所) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">支出履歴</h2>
            <span className="text-sm text-gray-500">
              合計: ¥
              {expenses.reduce((a, b) => a + b.amount, 0).toLocaleString()}
            </span>
          </div>

          {expenses.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              まだ支出がありません
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div>
                    <p className="font-bold text-gray-800">{exp.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {exp.members?.name || "不明"} が支払いました
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-indigo-600">
                      ¥{exp.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(exp.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 清算プラン  */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-20">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">清算方法</h2>
          </div>

          {settlements.length === 0 ? (
            <div className="text-center py-6 bg-green-50 rounded-lg border border-green-100">
              <p className="text-green-700 font-medium">
                貸し借りはすべて清算されています！
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {settlements.map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-bold text-gray-700">
                      {getName(tx.from)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="font-bold text-gray-700">
                      {getName(tx.to)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500 mr-2">へ支払う</span>
                    <span className="font-bold text-lg text-indigo-600">
                      ¥{tx.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フローティングボタン */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* モーダル */}
        <ExpenseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          groupId={groupId}
          members={members}
          onSuccess={() => {
            fetchGroupData(); // 登録後にリストを更新
          }}
        />
      </div>
    </div>
  );
}
