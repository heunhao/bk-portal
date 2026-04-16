"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const EXPENSE_CATEGORIES = [
  { value: "food", label: "식비" },
  { value: "transport", label: "교통" },
  { value: "shopping", label: "쇼핑" },
  { value: "medical", label: "의료" },
  { value: "culture", label: "문화/여가" },
  { value: "education", label: "교육" },
  { value: "utility", label: "공과금" },
  { value: "other_expense", label: "기타" },
];

const INCOME_CATEGORIES = [
  { value: "salary", label: "월급" },
  { value: "freelance", label: "부업" },
  { value: "investment", label: "투자" },
  { value: "other_income", label: "기타" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const month = searchParams.get("month") ?? String(new Date().getMonth() + 1);

  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const categories = type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeChange = (newType: "EXPENSE" | "INCOME") => {
    setType(newType);
    setCategory(newType === "EXPENSE" ? "food" : "salary");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(amount) <= 0) {
      setError("금액을 올바르게 입력해주세요");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount, category, description, date }),
    });

    if (res.ok) {
      router.push(`/ledger?year=${year}&month=${month}`);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "오류가 발생했습니다");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/ledger?year=${year}&month=${month}`} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">내역 추가</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
          {/* Type Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => handleTypeChange("EXPENSE")}
              className={`flex-1 py-2.5 text-sm font-medium transition ${
                type === "EXPENSE"
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              지출
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("INCOME")}
              className={`flex-1 py-2.5 text-sm font-medium transition ${
                type === "INCOME"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              수입
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">금액</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-8 text-right text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">카테고리</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`py-2 text-xs rounded-xl border transition ${
                    category === cat.value
                      ? type === "EXPENSE"
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-700"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">메모 (선택)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="메모를 입력하세요"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-700"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-600 transition disabled:opacity-50"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense>
      <NewTransactionForm />
    </Suspense>
  );
}
