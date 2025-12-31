"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid"; // 追加: IDを自分で作るための道具

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState("");

  const createGroup = async () => {
    if (!groupName) return;
    setLoading(true);

    // 1. ここでIDを先に決めてしまう（ブラウザ側で生成）
    const newGroupId = uuidv4();

    // 2. IDを指定してINSERTする（.select() は使わない！）
    const { error } = await (supabase.from("groups") as any).insert({
      id: newGroupId,
      name: groupName,
      currency: "JPY",
    });

    if (error) {
      console.error("詳細なエラー:", error);
      alert("エラーが発生しました: " + error.message);
      setLoading(false);
      return;
    }

    // 3. 自分で作ったIDだから、戻り値を待たずに遷移できる
    router.push(`/groups/${newGroupId}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Walica Clone (AI Driven)
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            ログイン不要、URL共有だけで割り勘管理
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="group-name"
              className="block text-sm font-medium text-gray-700"
            >
              イベント名（例：箱根旅行）
            </label>
            <input
              id="group-name"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="イベント名を入力"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <button
            onClick={createGroup}
            disabled={loading || !groupName}
            className={`flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 
              ${
                loading || !groupName
                  ? "bg-indigo-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
          >
            {loading ? "作成中..." : "新しく始める"}
          </button>
        </div>
      </div>
    </div>
  );
}
