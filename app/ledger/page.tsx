"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type TransactionType = "INCOME" | "EXPENSE";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  salary: "월급", freelance: "부업", investment: "투자", other_income: "기타수입",
  food: "식비", transport: "교통", shopping: "쇼핑", medical: "의료",
  culture: "문화/여가", education: "교육", utility: "공과금", other_expense: "기타지출",
};

function formatAmount(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function LedgerPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/ledger?year=${year}&month=${month}`);
    const data = await res.json();
    setTransactions(data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/ledger/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">가계부</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Month Navigator */}
        <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 border border-gray-200">
          <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-semibold text-gray-800">{year}년 {month}월</span>
          <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-xs text-blue-500 font-medium mb-1">수입</p>
            <p className="font-bold text-blue-700 text-sm">{formatAmount(totalIncome)}</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <p className="text-xs text-red-500 font-medium mb-1">지출</p>
            <p className="font-bold text-red-700 text-sm">{formatAmount(totalExpense)}</p>
          </div>
          <div className={`rounded-2xl p-4 border ${balance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-orange-50 border-orange-100"}`}>
            <p className={`text-xs font-medium mb-1 ${balance >= 0 ? "text-emerald-500" : "text-orange-500"}`}>잔액</p>
            <p className={`font-bold text-sm ${balance >= 0 ? "text-emerald-700" : "text-orange-700"}`}>{formatAmount(Math.abs(balance))}</p>
          </div>
        </div>

        {/* Add Button */}
        <Link
          href={`/ledger/new?year=${year}&month=${month}`}
          className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 text-white rounded-2xl font-medium text-sm hover:bg-emerald-600 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          내역 추가
        </Link>

        {/* Transaction List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">이달의 내역이 없습니다</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center px-4 py-3.5 gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${t.type === "INCOME" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"}`}>
                    {t.type === "INCOME" ? "+" : "-"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </p>
                    {t.description && (
                      <p className="text-xs text-gray-400 truncate">{t.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${t.type === "INCOME" ? "text-blue-600" : "text-red-600"}`}>
                      {t.type === "INCOME" ? "+" : "-"}{formatAmount(t.amount)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="ml-1 p-1 text-gray-300 hover:text-red-400 transition flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
