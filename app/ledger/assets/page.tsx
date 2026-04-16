"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LedgerNav from "@/components/LedgerNav";

type TxType = "INCOME" | "EXPENSE";
interface Category { id: string; name: string; }
interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  counterpart: string | null;
  description: string | null;
  date: string;
  category: Category | null;
}
interface PaymentMethodWithTx {
  id: string;
  name: string;
  type: "ASSET" | "CARD";
  transactions: Transaction[];
}

function formatAmount(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}
function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

export default function AssetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<PaymentMethodWithTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/ledger/payment-methods/summary?year=${year}&month=${month}`);
    setData(await res.json());
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const cards = data.filter(p => p.type === "CARD");
  const assets = data.filter(p => p.type === "ASSET");

  const getSummary = (pm: PaymentMethodWithTx) => {
    const income = pm.transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const expense = pm.transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    return { income, expense, count: pm.transactions.length };
  };

  const PaymentCard = ({ pm }: { pm: PaymentMethodWithTx }) => {
    const { income, expense, count } = getSummary(pm);
    const isOpen = openId === pm.id;

    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setOpenId(isOpen ? null : pm.id)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{pm.type === "CARD" ? "💳" : "🏦"}</span>
            <div className="text-left">
              <p className="font-semibold text-gray-800">{pm.name}</p>
              <p className="text-xs text-gray-400">{count}건</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              {income > 0 && <p className="text-xs text-blue-500">+{formatAmount(income)}</p>}
              {expense > 0 && <p className="text-sm font-semibold text-red-600">-{formatAmount(expense)}</p>}
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Mobile amount */}
        <div className="sm:hidden px-5 pb-3 flex gap-4">
          {income > 0 && <span className="text-xs text-blue-500">+{formatAmount(income)}</span>}
          {expense > 0 && <span className="text-sm font-semibold text-red-600">-{formatAmount(expense)}</span>}
        </div>

        {isOpen && (
          <div className="border-t border-gray-100">
            {pm.transactions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">이달의 내역이 없습니다</p>
            ) : (
              <>
                {/* Table header (desktop) */}
                <div className="hidden sm:grid grid-cols-[100px_1fr_1fr_1fr_90px] gap-2 px-5 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                  <span>날짜</span>
                  <span>비용 항목</span>
                  <span>거래처</span>
                  <span>내용</span>
                  <span className="text-right">금액</span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {pm.transactions.map(t => (
                    <li key={t.id}>
                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-[100px_1fr_1fr_1fr_90px] gap-2 px-5 py-2.5 text-sm items-center">
                        <span className="text-gray-500">{formatDate(t.date)}</span>
                        <span className="text-gray-700 truncate">{t.category?.name ?? "-"}</span>
                        <span className="text-gray-700 truncate">{t.counterpart ?? "-"}</span>
                        <span className="text-gray-500 truncate">{t.description ?? "-"}</span>
                        <span className={`text-right font-semibold ${t.type === "INCOME" ? "text-blue-600" : "text-red-600"}`}>
                          {t.type === "INCOME" ? "+" : "-"}{formatAmount(t.amount)}
                        </span>
                      </div>
                      {/* Mobile */}
                      <div className="sm:hidden flex items-start px-5 py-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-800">{t.category?.name ?? "미분류"}</span>
                            {t.counterpart && <span className="text-xs text-gray-500">{t.counterpart}</span>}
                          </div>
                          {t.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.date)}</p>
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${t.type === "INCOME" ? "text-blue-600" : "text-red-600"}`}>
                          {t.type === "INCOME" ? "+" : "-"}{formatAmount(t.amount)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">가계부</h1>
        </div>
        <div className="max-w-4xl mx-auto px-4">
          <LedgerNav />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Month Navigator */}
        <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 border border-gray-200">
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

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
            <p>등록된 자산/카드가 없습니다</p>
            <Link href="/ledger/settings" className="text-emerald-500 text-sm mt-2 block hover:underline">
              설정에서 추가하기
            </Link>
          </div>
        ) : (
          <>
            {cards.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 px-1">💳 카드</p>
                {cards.map(pm => <PaymentCard key={pm.id} pm={pm} />)}
              </div>
            )}
            {assets.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 px-1">🏦 자산</p>
                {assets.map(pm => <PaymentCard key={pm.id} pm={pm} />)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
