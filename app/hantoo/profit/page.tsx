"use client";

import { useState } from "react";
import Link from "next/link";

type Period = "today" | "1week" | "1month" | "custom";

interface StockProfit {
  name: string;
  code: string;
  buyAmt: number;
  sllAmt: number;
  profit: number;
  profitRt: string;
  fee: number;
  tax: number;
}

interface Summary {
  totRlztPfls: number;
  totPftrt: string;
  sllTrAmt: number;
  buyTrAmt: number;
  totFee: number;
  totTax: number;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

function calcRange(period: Period): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const f = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  if (period === "today")  return { start: f(today), end: f(today) };
  if (period === "1week")  { const d = new Date(today); d.setDate(d.getDate() - 7);  return { start: f(d), end: f(today) }; }
  if (period === "1month") { const d = new Date(today); d.setMonth(d.getMonth() - 1); return { start: f(d), end: f(today) }; }
  return { start: f(today), end: f(today) };
}

export default function HantooProfitPage() {
  const [period, setPeriod]       = useState<Period>("1week");
  const [startDate, setStartDate] = useState(calcRange("1week").start);
  const [endDate, setEndDate]     = useState(calcRange("1week").end);
  const [stocks, setStocks]       = useState<StockProfit[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [queried, setQueried]     = useState(false);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
    if (p !== "custom") {
      const r = calcRange(p);
      setStartDate(r.start);
      setEndDate(r.end);
    }
  };

  const handleFetch = async () => {
    setLoading(true);
    setError("");
    setStocks([]);
    setSummary(null);
    setQueried(false);
    try {
      const res  = await fetch("/api/hantoo/profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json();
      if (data.success) {
        setStocks(data.stocks);
        setSummary(data.summary);
        setQueried(true);
      } else {
        setError(data.error ?? "조회 실패");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const totalBuy    = stocks.reduce((s, t) => s + t.buyAmt, 0);
  const totalSll    = stocks.reduce((s, t) => s + t.sllAmt, 0);
  const totalDiff   = totalSll - totalBuy;
  const totalFee    = stocks.reduce((s, t) => s + t.fee, 0);
  const totalTax    = stocks.reduce((s, t) => s + t.tax, 0);
  const totalProfit = stocks.reduce((s, t) => s + t.profit, 0);

  const periodOptions: { value: Period; label: string }[] = [
    { value: "today",  label: "오늘" },
    { value: "1week",  label: "1주일" },
    { value: "1month", label: "1개월" },
    { value: "custom", label: "직접입력" },
  ];

  const profitColor = (v: number) =>
    v > 0 ? "text-red-500" : v < 0 ? "text-blue-500" : "text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">매매손익현황</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* 필터 패널 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-sm font-medium text-gray-600 w-8">기간</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {periodOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="period"
                    checked={period === opt.value}
                    onChange={() => handlePeriod(opt.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            {period === "custom" && (
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <span className="text-gray-400 text-sm">~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleFetch}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {loading ? "조회 중..." : "조회"}
          </button>
        </div>

        {/* 오류 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 실현손익 요약 */}
        {queried && summary && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600">실현손익</span>
              <span className={`text-2xl font-bold ${profitColor(summary.totRlztPfls)}`}>
                {summary.totRlztPfls >= 0 ? "+" : ""}{fmt(summary.totRlztPfls)}원
              </span>
              <span className={`text-sm font-semibold ${profitColor(summary.totRlztPfls)}`}>
                ({parseFloat(summary.totPftrt).toFixed(2)}%)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
              {[
                { label: "총 매도금액", value: fmt(summary.sllTrAmt) + "원" },
                { label: "총 매수금액", value: fmt(summary.buyTrAmt) + "원" },
                { label: "총 매매비용", value: fmt(summary.totFee) + "원" },
                { label: "총 제세금",   value: fmt(summary.totTax) + "원" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-700">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 종목별 테이블 */}
        {queried && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

            {/* 데스크탑 */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-center font-semibold">종목명</th>
                    <th className="px-4 py-3 text-right font-semibold">매수금액</th>
                    <th className="px-4 py-3 text-right font-semibold">매도금액</th>
                    <th className="px-4 py-3 text-right font-semibold">차액</th>
                    <th className="px-4 py-3 text-right font-semibold">수수료</th>
                    <th className="px-4 py-3 text-right font-semibold">제세금</th>
                    <th className="px-4 py-3 text-right font-semibold">순수익</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stocks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        조회된 매매손익이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {stocks.map((s, i) => {
                        const diff = s.sllAmt - s.buyAmt;
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-center font-medium text-gray-800">{s.name}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{fmt(s.buyAmt)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{fmt(s.sllAmt)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${profitColor(diff)}`}>
                              {diff >= 0 ? "+" : ""}{fmt(diff)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">{fmt(s.fee)}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{fmt(s.tax)}</td>
                            <td className={`px-4 py-3 text-right font-bold ${profitColor(s.profit)}`}>
                              {s.profit >= 0 ? "+" : ""}{fmt(s.profit)}
                            </td>
                          </tr>
                        );
                      })}
                      {/* 빈 행 */}
                      <tr className="h-3 bg-gray-50" />
                      {/* 합계 행 */}
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td className="px-4 py-3 text-center font-bold text-gray-700">합계</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(totalBuy)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(totalSll)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${profitColor(totalDiff)}`}>
                          {totalDiff >= 0 ? "+" : ""}{fmt(totalDiff)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-600">{fmt(totalFee)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-600">{fmt(totalTax)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${profitColor(totalProfit)}`}>
                          {totalProfit >= 0 ? "+" : ""}{fmt(totalProfit)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="sm:hidden">
              {stocks.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">조회된 매매손익이 없습니다.</div>
              ) : (
                <>
                  <ul className="divide-y divide-gray-100">
                    {stocks.map((s, i) => {
                      const diff = s.sllAmt - s.buyAmt;
                      return (
                        <li key={i} className="px-4 py-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                            <span className={`text-sm font-bold ${profitColor(s.profit)}`}>
                              {s.profit >= 0 ? "+" : ""}{fmt(s.profit)}원
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-xs text-gray-500">
                            <span>매수 {fmt(s.buyAmt)}</span>
                            <span>매도 {fmt(s.sllAmt)}</span>
                            <span className={profitColor(diff)}>차액 {diff >= 0 ? "+" : ""}{fmt(diff)}</span>
                            <span>수수료 {fmt(s.fee)}</span>
                            <span>제세금 {fmt(s.tax)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="px-4 py-3 bg-gray-50 border-t-2 border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">합계 순수익</span>
                    <span className={`text-base font-bold ${profitColor(totalProfit)}`}>
                      {totalProfit >= 0 ? "+" : ""}{fmt(totalProfit)}원
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
