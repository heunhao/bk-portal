"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LedgerNav from "@/components/LedgerNav";

type TxType = "INCOME" | "EXPENSE";
type PmType = "ASSET" | "CARD";

interface Category { id: string; name: string; type: TxType; }
interface PaymentMethod { id: string; name: string; type: PmType; }

function Tag({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-sm text-gray-700">
      <span>{label}</span>
      <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"category" | "payment">("category");
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Category form
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<TxType>("EXPENSE");

  // Payment form
  const [pmName, setPmName] = useState("");
  const [pmType, setPmType] = useState<PmType>("CARD");

  useEffect(() => {
    fetch("/api/ledger/categories").then(r => r.json()).then(setCategories);
    fetch("/api/ledger/payment-methods").then(r => r.json()).then(setPaymentMethods);
  }, []);

  const addCategory = async () => {
    if (!catName.trim()) return;
    const res = await fetch("/api/ledger/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim(), type: catType }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories(prev => [...prev, cat]);
      setCatName("");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("삭제하시겠습니까?\n해당 항목을 사용한 거래내역에서 항목이 제거됩니다.")) return;
    await fetch(`/api/ledger/categories/${id}`, { method: "DELETE" });
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const addPaymentMethod = async () => {
    if (!pmName.trim()) return;
    const res = await fetch("/api/ledger/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: pmName.trim(), type: pmType }),
    });
    if (res.ok) {
      const pm = await res.json();
      setPaymentMethods(prev => [...prev, pm]);
      setPmName("");
    }
  };

  const deletePaymentMethod = async (id: string) => {
    if (!confirm("삭제하시겠습니까?\n해당 자산/카드를 사용한 거래내역에서 제거됩니다.")) return;
    await fetch(`/api/ledger/payment-methods/${id}`, { method: "DELETE" });
    setPaymentMethods(prev => prev.filter(p => p.id !== id));
  };

  const expenseCategories = categories.filter(c => c.type === "EXPENSE");
  const incomeCategories = categories.filter(c => c.type === "INCOME");
  const assets = paymentMethods.filter(p => p.type === "ASSET");
  const cards = paymentMethods.filter(p => p.type === "CARD");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">가계부</h1>
        </div>
        <div className="max-w-2xl mx-auto px-4">
          <LedgerNav />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Inner Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("category")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "category" ? "bg-emerald-500 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            비용 항목
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "payment" ? "bg-emerald-500 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            자산 · 카드
          </button>
        </div>

        {activeTab === "category" && (
          <div className="space-y-4">
            {/* Add Category */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">항목 추가</p>
              <div className="flex gap-2">
                <input
                  type="text" value={catName} onChange={e => setCatName(e.target.value)}
                  placeholder="항목명 입력"
                  onKeyDown={e => e.key === "Enter" && addCategory()}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <select
                  value={catType} onChange={e => setCatType(e.target.value as TxType)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-700"
                >
                  <option value="EXPENSE">지출</option>
                  <option value="INCOME">수입</option>
                </select>
                <button
                  onClick={addCategory}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition"
                >
                  추가
                </button>
              </div>
            </div>

            {/* Expense Categories */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                지출 항목
              </p>
              {expenseCategories.length === 0 ? (
                <p className="text-sm text-gray-400">아직 항목이 없습니다</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {expenseCategories.map(c => (
                    <Tag key={c.id} label={c.name} onDelete={() => deleteCategory(c.id)} />
                  ))}
                </div>
              )}
            </div>

            {/* Income Categories */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                수입 항목
              </p>
              {incomeCategories.length === 0 ? (
                <p className="text-sm text-gray-400">아직 항목이 없습니다</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {incomeCategories.map(c => (
                    <Tag key={c.id} label={c.name} onDelete={() => deleteCategory(c.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "payment" && (
          <div className="space-y-4">
            {/* Add Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">자산/카드 추가</p>
              <div className="flex gap-2">
                <input
                  type="text" value={pmName} onChange={e => setPmName(e.target.value)}
                  placeholder="이름 입력"
                  onKeyDown={e => e.key === "Enter" && addPaymentMethod()}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <select
                  value={pmType} onChange={e => setPmType(e.target.value as PmType)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-700"
                >
                  <option value="CARD">카드</option>
                  <option value="ASSET">자산</option>
                </select>
                <button
                  onClick={addPaymentMethod}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition"
                >
                  추가
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                💳 카드
              </p>
              {cards.length === 0 ? (
                <p className="text-sm text-gray-400">아직 카드가 없습니다</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cards.map(p => (
                    <Tag key={p.id} label={p.name} onDelete={() => deletePaymentMethod(p.id)} />
                  ))}
                </div>
              )}
            </div>

            {/* Assets */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                🏦 자산
              </p>
              {assets.length === 0 ? (
                <p className="text-sm text-gray-400">아직 자산이 없습니다</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {assets.map(p => (
                    <Tag key={p.id} label={p.name} onDelete={() => deletePaymentMethod(p.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
