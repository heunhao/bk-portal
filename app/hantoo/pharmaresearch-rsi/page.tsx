"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RsiRow {
  date: string;
  close: number;
  rsi: number;
  signal: number;
}

interface RsiData {
  ticker: string;
  name: string;
  rows: RsiRow[];
  latest: RsiRow;
  count: number;
  error?: string;
}

function RsiChart({ rows }: { rows: RsiRow[] }) {
  if (rows.length === 0) return null;

  const W = 700;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minRsi = 0;
  const maxRsi = 100;

  const xScale = (i: number) => PAD.left + (i / (rows.length - 1)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - ((v - minRsi) / (maxRsi - minRsi)) * chartH;

  const rsiPath = rows
    .map((r, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(r.rsi).toFixed(1)}`)
    .join(" ");

  const sigPath = rows
    .map((r, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(r.signal).toFixed(1)}`)
    .join(" ");

  // 월별 눈금 레이블 (중복 제거)
  const monthLabels: { i: number; label: string }[] = [];
  let lastMonth = "";
  rows.forEach((r, i) => {
    const m = r.date.slice(0, 7);
    if (m !== lastMonth) {
      monthLabels.push({ i, label: r.date.slice(5, 7) + "월" });
      lastMonth = m;
    }
  });

  // 과매수/과매도 영역 Fill
  const y30  = yScale(30);
  const y70  = yScale(70);
  const xEnd = xScale(rows.length - 1);
  const xSt  = xScale(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* 과매수 영역 (70 이상) */}
      <rect x={PAD.left} y={PAD.top} width={chartW} height={y70 - PAD.top} fill="#fee2e2" opacity="0.4" />
      {/* 과매도 영역 (30 이하) */}
      <rect x={PAD.left} y={y30} width={chartW} height={PAD.top + chartH - y30} fill="#dbeafe" opacity="0.4" />

      {/* 기준선 70 / 50 / 30 */}
      {[70, 50, 30].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} y1={yScale(v)} x2={xEnd} y2={yScale(v)}
            stroke={v === 50 ? "#9ca3af" : v === 70 ? "#ef4444" : "#3b82f6"}
            strokeDasharray="4 3" strokeWidth="1" opacity="0.6"
          />
          <text x={PAD.left - 4} y={yScale(v) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
        </g>
      ))}

      {/* RSI 라인 */}
      <path d={rsiPath} fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Signal 라인 */}
      <path d={sigPath} fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="5 3" strokeLinejoin="round" />

      {/* 월 레이블 */}
      {monthLabels.map(({ i, label }) => (
        <g key={i}>
          <line x1={xScale(i)} y1={PAD.top} x2={xScale(i)} y2={PAD.top + chartH} stroke="#e5e7eb" strokeWidth="1" />
          <text x={xScale(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#9ca3af">{label}</text>
        </g>
      ))}

      {/* 테두리 */}
      <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="none" stroke="#e5e7eb" strokeWidth="1" rx="2" />

      {/* 범례 */}
      <line x1={xEnd - 90} y1={PAD.top + 8} x2={xEnd - 76} y2={PAD.top + 8} stroke="#6366f1" strokeWidth="2" />
      <text x={xEnd - 73} y={PAD.top + 12} fontSize="9" fill="#6366f1">RSI(14)</text>
      <line x1={xEnd - 40} y1={PAD.top + 8} x2={xEnd - 26} y2={PAD.top + 8} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
      <text x={xEnd - 23} y={PAD.top + 12} fontSize="9" fill="#f59e0b">Signal(9)</text>

      {/* 현재 RSI 포인트 */}
      <circle
        cx={xScale(rows.length - 1)}
        cy={yScale(rows[rows.length - 1].rsi)}
        r="3.5"
        fill="#6366f1"
      />
    </svg>
  );
}

function rsiColor(rsi: number) {
  if (rsi >= 70) return "text-red-500";
  if (rsi <= 30) return "text-blue-500";
  return "text-gray-800";
}

function rsiLabel(rsi: number) {
  if (rsi >= 70) return "과매수";
  if (rsi <= 30) return "과매도";
  if (rsi >= 60) return "강세";
  if (rsi <= 40) return "약세";
  return "중립";
}

export default function PharmaResearchRsiPage() {
  const [data, setData] = useState<RsiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/hantoo/pharmaresearch-rsi")
      .then((r) => r.json())
      .then((d: RsiData) => {
        if (d.error) { setError(d.error); }
        else { setData(d); }
      })
      .catch(() => setError("데이터 로드 실패"))
      .finally(() => setLoading(false));
  }, []);

  const latest = data?.latest;
  const rows   = data?.rows ?? [];
  const sorted = [...rows].reverse(); // 최신순

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">파마리서치 RSI (최근 6개월)</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">RSI 데이터 불러오는 중...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* 현재 상태 카드 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400">파마리서치 · 214450</p>
                  <p className="text-sm text-gray-500 mt-0.5">기준일: {latest?.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{latest?.close.toLocaleString()}원</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">RSI(14)</p>
                  <p className={`text-xl font-bold ${rsiColor(latest?.rsi ?? 50)}`}>
                    {latest?.rsi.toFixed(1)}
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${rsiColor(latest?.rsi ?? 50)}`}>
                    {rsiLabel(latest?.rsi ?? 50)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Signal(9)</p>
                  <p className="text-xl font-bold text-amber-500">{latest?.signal.toFixed(1)}</p>
                  <p className="text-xs mt-0.5 text-gray-400">이동평균</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">RSI-Signal</p>
                  {latest && (
                    <>
                      <p className={`text-xl font-bold ${(latest.rsi - latest.signal) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {(latest.rsi - latest.signal) >= 0 ? "+" : ""}{(latest.rsi - latest.signal).toFixed(1)}
                      </p>
                      <p className="text-xs mt-0.5 text-gray-400">
                        {(latest.rsi - latest.signal) >= 0 ? "골든크로스" : "데드크로스"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RSI 차트 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">RSI 추이 (최근 6개월)</h2>
              <div className="overflow-x-auto">
                <RsiChart rows={rows} />
              </div>
              <div className="mt-3 flex gap-4 text-xs text-gray-400">
                <span><span className="inline-block w-3 h-0.5 bg-red-200 mr-1"></span>과매수(70↑)</span>
                <span><span className="inline-block w-3 h-0.5 bg-blue-200 mr-1"></span>과매도(30↓)</span>
              </div>
            </div>

            {/* 일별 데이터 테이블 */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 text-sm">일별 RSI 데이터</h2>
                <span className="text-xs text-gray-400">{rows.length}거래일</span>
              </div>
              <div className="grid grid-cols-[1fr_90px_70px_80px_80px] gap-1 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                <span>날짜</span>
                <span className="text-right">종가</span>
                <span className="text-right">RSI</span>
                <span className="text-right">Signal</span>
                <span className="text-right">상태</span>
              </div>
              <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {sorted.map((row) => (
                  <li key={row.date} className="grid grid-cols-[1fr_90px_70px_80px_80px] gap-1 px-5 py-2.5 items-center text-sm hover:bg-gray-50">
                    <span className="text-gray-500 text-xs">{row.date}</span>
                    <span className="text-right font-medium text-gray-800">{row.close.toLocaleString()}</span>
                    <span className={`text-right font-semibold ${rsiColor(row.rsi)}`}>{row.rsi.toFixed(1)}</span>
                    <span className="text-right text-amber-500">{row.signal.toFixed(1)}</span>
                    <span className={`text-right text-xs font-medium ${rsiColor(row.rsi)}`}>{rsiLabel(row.rsi)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
