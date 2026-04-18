"use client";

import { useState } from "react";
import Link from "next/link";

type Period = "today" | "1week" | "1month" | "custom";
type SideCode = "00" | "01" | "02";

interface Trade {
  date: string;
  side: string;
  sideCode: string;
  name: string;
  code: string;
  qty: number;
  unitPrice: number;
  amount: number;
  fee: number;
  total: number;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

function fmtDate(s: string) {
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function calcRange(period: Period): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  if (period === "today")  return { start: fmt(today), end: fmt(today) };
  if (period === "1week")  { const d = new Date(today); d.setDate(d.getDate() - 7);  return { start: fmt(d), end: fmt(today) }; }
  if (period === "1month") { const d = new Date(today); d.setMonth(d.getMonth() - 1); return { start: fmt(d), end: fmt(today) }; }
  return { start: fmt(today), end: fmt(today) };
}

export default function HantooHistoryPage() {
  const [period, setPeriod]       = useState<Period>("1week");
  const [startDate, setStartDate] = useState(calcRange("1week").start);
  const [endDate, setEndDate]     = useState(calcRange("1week").end);
  const [sideCode, setSideCode]   = useState<SideCode>("00");
  const [trades, setTrades]       = useState<Trade[]>([]);
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
    setTrades([]);
    setQueried(false);
    try {
      const res  = await fetch("/api/hantoo/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, sideCode }),
      });
      const data = await res.json();
      if (data.success) {
        setTrades(data.trades);
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

  const totalAmount = trades.reduce((s, t) => s + t.amount, 0);
  const totalFee    = trades.reduce((s, t) => s + t.fee, 0);
  const totalSum    = trades.reduce((s, t) => s + t.total, 0);

  const periodOptions: { value: Period; label: string }[] = [
    { value: "today",  label: "오늘" },
    { value: "1week",  label: "1주일" },
    { value: "1month", label: "1개월" },
    { value: "custom", label: "직접입력" },
  ];

  const sideOptions: { value: SideCode; label: string }[] = [
    { value: "00", label: "전체" },
    { value: "02", label: "매수" },
    { value: "01", label: "매도" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">거래내역</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* 필터 패널 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">

          {/* 기간 */}
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

          {/* 거래 구분 */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-sm font-medium text-gray-600 w-8">거래</span>
            <div className="flex gap-x-4">
              {sideOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="side"
                    checked={sideCode === opt.value}
                    onChange={() => setSideCode(opt.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
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

        {/* 결과 테이블 */}
        {queried && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* 데스크탑 테이블 */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-center font-semibold">일자</th>
                    <th className="px-4 py-3 text-center font-semibold">거래</th>
                    <th className="px-4 py-3 text-center font-semibold">종목명</th>
                    <th className="px-4 py-3 text-right font-semibold">금액</th>
                    <th className="px-4 py-3 text-right font-semibold">매매비용</th>
                    <th className="px-4 py-3 text-right font-semibold">합계</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        조회된 거래내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {trades.map((t, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-center text-gray-700">{fmtDate(t.date)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${t.sideCode === "02" ? "text-red-500" : "text-blue-500"}`}>
                              {t.side}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-800 font-medium">{t.name}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{fmt(t.amount)}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{fmt(t.fee)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(t.total)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td className="px-4 py-3 text-center font-bold text-gray-700" colSpan={3}>합계</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(totalAmount)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-600">{fmt(totalFee)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(totalSum)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="sm:hidden">
              {trades.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">조회된 거래내역이 없습니다.</div>
              ) : (
                <>
                  <ul className="divide-y divide-gray-100">
                    {trades.map((t, i) => (
                      <li key={i} className="px-4 py-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              t.sideCode === "02" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                            }`}>{t.side}</span>
                            <span className="text-sm font-medium text-gray-800">{t.name}</span>
                          </div>
                          <span className="text-xs text-gray-400">{fmtDate(t.date)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>금액 {fmt(t.amount)}원</span>
                          <span>비용 {fmt(t.fee)}원</span>
                          <span className="font-semibold text-gray-700">합계 {fmt(t.total)}원</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="px-4 py-3 bg-gray-50 border-t-2 border-gray-200 flex justify-between text-sm font-bold text-gray-700">
                    <span>합계</span>
                    <span>{fmt(totalSum)}원</span>
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
