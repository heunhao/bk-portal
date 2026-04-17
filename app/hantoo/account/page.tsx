"use client";

import { useState } from "react";
import Link from "next/link";

interface Holding {
  code: string;
  name: string;
  qty: string;
  avgPrice: string;
  currPrice: string;
  evalAmt: string;
  profitRate: string;
  profitAmt: string;
}

interface Summary {
  totalEval: string;
  stockEval: string;
  deposit: string;
  profitAmt: string;
  profitRate: string;
}

function fmt(n: string) {
  return Number(n || 0).toLocaleString("ko-KR");
}

function ProfitBadge({ rate }: { rate: string }) {
  const v = parseFloat(rate);
  const color = v > 0 ? "text-red-500" : v < 0 ? "text-blue-500" : "text-gray-500";
  return <span className={`font-semibold ${color}`}>{v > 0 ? "+" : ""}{parseFloat(rate).toFixed(2)}%</span>;
}

export default function HantooAccountPage() {
  const [loading, setLoading] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const fetchBalance = async () => {
    setLoading(true);
    setError("");
    setHoldings([]);
    setSummary(null);
    try {
      const res = await fetch("/api/hantoo/account", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setHoldings(data.holdings);
        setSummary(data.summary);
      } else {
        setError(data.error ?? "조회 실패");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">계좌 조회</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        <button
          onClick={fetchBalance}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 transition"
        >
          {loading ? "조회 중..." : "잔고 조회"}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "총 평가금액", value: fmt(summary.totalEval) + "원" },
              { label: "주식 평가금액", value: fmt(summary.stockEval) + "원" },
              { label: "예수금", value: fmt(summary.deposit) + "원" },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className="font-bold text-gray-800 text-sm">{item.value}</p>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3 bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">평가손익</p>
              <div className="text-right">
                <p className="text-sm font-bold">
                  <ProfitBadge rate={summary.profitRate} />
                </p>
                <p className="text-xs text-gray-500">{Number(summary.profitAmt) >= 0 ? "+" : ""}{fmt(summary.profitAmt)}원</p>
              </div>
            </div>
          </div>
        )}

        {holdings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">보유 종목</h2>
              <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
                {holdings.length}종목
              </span>
            </div>
            <div className="hidden sm:grid grid-cols-[80px_1fr_60px_100px_100px_80px_90px] gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
              <span>코드</span><span>종목명</span><span className="text-right">수량</span>
              <span className="text-right">평균단가</span><span className="text-right">현재가</span>
              <span className="text-right">수익률</span><span className="text-right">평가손익</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {holdings.map((h) => (
                <li key={h.code}>
                  <div className="hidden sm:grid grid-cols-[80px_1fr_60px_100px_100px_80px_90px] gap-2 px-5 py-3 items-center text-sm">
                    <span className="font-mono text-gray-400 text-xs">{h.code}</span>
                    <span className="font-medium text-gray-800 truncate">{h.name}</span>
                    <span className="text-right text-gray-600">{fmt(h.qty)}</span>
                    <span className="text-right text-gray-600">{fmt(h.avgPrice)}</span>
                    <span className="text-right font-semibold text-gray-800">{fmt(h.currPrice)}</span>
                    <span className="text-right"><ProfitBadge rate={h.profitRate} /></span>
                    <span className={`text-right text-xs font-semibold ${parseFloat(h.profitAmt) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                      {parseFloat(h.profitAmt) >= 0 ? "+" : ""}{fmt(h.profitAmt)}
                    </span>
                  </div>
                  <div className="sm:hidden flex items-center px-4 py-3.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{h.name}</p>
                      <p className="text-xs text-gray-400">{h.code} · {fmt(h.qty)}주 · 평균 {fmt(h.avgPrice)}원</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-800">{fmt(h.currPrice)}원</p>
                      <ProfitBadge rate={h.profitRate} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary && holdings.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center">
            <p className="text-gray-400 text-sm">보유 종목이 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}
