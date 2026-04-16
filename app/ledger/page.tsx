"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import LedgerNav from "@/components/LedgerNav";

type TransactionType = "INCOME" | "EXPENSE";

interface Category { id: string; name: string; type: TransactionType; }
interface PaymentMethod { id: string; name: string; type: string; }
interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  counterpart: string | null;
  description: string | null;
  date: string;
  category: Category | null;
  paymentMethod: PaymentMethod | null;
}

function formatAmount(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}
function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${String(dt.getDate()).padStart(2, "0")}`;
}

export default function LedgerPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterCounterpart, setFilterCounterpart] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (filterCategory) params.set("categoryId", filterCategory);
    if (filterPayment) params.set("paymentMethodId", filterPayment);
    if (filterCounterpart) params.set("counterpart", filterCounterpart);

    const [txRes, catRes, pmRes] = await Promise.all([
      fetch(`/api/ledger?${params}`),
      fetch("/api/ledger/categories"),
      fetch("/api/ledger/payment-methods"),
    ]);
    setTransactions(await txRes.json());
    setCategories(await catRes.json());
    setPaymentMethods(await pmRes.json());
    setLoading(false);
  }, [year, month, filterCategory, filterPayment, filterCounterpart]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-xs text-blue-500 font-medium mb-1">수입</p>
            <p className="font-bold text-blue-700 text-sm">{formatAmount(totalIncome)}</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <p className="text-xs text-red-500 font-medium mb-1">지출</p>
            <p className="font-bold text-red-700 text-sm">{formatAmount(totalExpense)}</p>
          </div>
          <div className={`rounded-2xl p-4 border ${totalIncome - totalExpense >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-orange-50 border-orange-100"}`}>
            <p className={`text-xs font-medium mb-1 ${totalIncome - totalExpense >= 0 ? "text-emerald-500" : "text-orange-500"}`}>잔액</p>
            <p className={`font-bold text-sm ${totalIncome - totalExpense >= 0 ? "text-emerald-700" : "text-orange-700"}`}>
              {formatAmount(Math.abs(totalIncome - totalExpense))}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-medium text-gray-500">필터</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="">전체 항목</option>
              {categories.filter(c => c.type === "EXPENSE").length > 0 && (
                <optgroup label="지출">
                  {categories.filter(c => c.type === "EXPENSE").map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              )}
              {categories.filter(c => c.type === "INCOME").length > 0 && (
                <optgroup label="수입">
                  {categories.filter(c => c.type === "INCOME").map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="">전체 자산/카드</option>
              {paymentMethods.filter(p => p.type === "ASSET").length > 0 && (
                <optgroup label="자산">
                  {paymentMethods.filter(p => p.type === "ASSET").map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
              {paymentMethods.filter(p => p.type === "CARD").length > 0 && (
                <optgroup label="카드">
                  {paymentMethods.filter(p => p.type === "CARD").map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <input
              type="text"
              placeholder="거래처 검색"
              value={filterCounterpart}
              onChange={e => setFilterCounterpart(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
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

        {/* Transaction Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_1fr_1fr_100px_72px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
            <span>날짜</span>
            <span>비용 항목</span>
            <span>자산/카드</span>
            <span>거래처</span>
            <span>내용</span>
            <span className="text-right">금액</span>
            <span></span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">내역이 없습니다</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <li key={t.id}>
                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_1fr_1fr_100px_72px] gap-2 px-4 py-3 items-center text-sm">
                    <span className="text-gray-500">{formatDate(t.date)}</span>
                    <span className="text-gray-700 truncate">{t.category?.name ?? "-"}</span>
                    <span className="text-gray-700 truncate">{t.paymentMethod?.name ?? "-"}</span>
                    <span className="text-gray-700 truncate">{t.counterpart ?? "-"}</span>
                    <span className="text-gray-500 truncate">{t.description ?? "-"}</span>
                    <span className={`text-right font-semibold ${t.type === "INCOME" ? "text-blue-600" : "text-red-600"}`}>
                      {t.type === "INCOME" ? "+" : "-"}{formatAmount(t.amount)}
                    </span>
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/ledger/edit/${t.id}?year=${year}&month=${month}`} className="p-1 text-gray-300 hover:text-emerald-500 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <button onClick={() => handleDelete(t.id)} className="p-1 text-gray-300 hover:text-red-400 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden flex items-start px-4 py-3 gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${t.type === "INCOME" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"}`}>
                      {t.type === "INCOME" ? "+" : "-"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{t.category?.name ?? "미분류"}</span>
                        {t.counterpart && <span className="text-xs text-gray-500">{t.counterpart}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {t.paymentMethod && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.paymentMethod.name}</span>}
                        {t.description && <span className="text-xs text-gray-400 truncate">{t.description}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${t.type === "INCOME" ? "text-blue-600" : "text-red-600"}`}>
                        {t.type === "INCOME" ? "+" : "-"}{formatAmount(t.amount)}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Link href={`/ledger/edit/${t.id}?year=${year}&month=${month}`} className="p-1 text-gray-300 hover:text-emerald-500 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <button onClick={() => handleDelete(t.id)} className="p-1 text-gray-300 hover:text-red-400 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
