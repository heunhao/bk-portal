"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface LossAlert {
  date: string;
  code: string;
  name: string;
  lossRate: number;
  price: number;
  threshold: number;
  alertedAt: string;
}

export default function HantooAlertsPage() {
  const [alerts, setAlerts]   = useState<LossAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/hantoo/alerts");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClear = async () => {
    if (!confirm("알림 이력을 모두 삭제하시겠습니까?")) return;
    setClearing(true);
    await fetch("/api/hantoo/alerts", { method: "DELETE" });
    setAlerts([]);
    setClearing(false);
  };

  const fmtDatetime = (s: string) => {
    if (s.length >= 16) return s.slice(0, 10) + " " + s.slice(11, 16);
    return s;
  };

  // 날짜별 그룹
  const grouped = alerts.reduce<Record<string, LossAlert[]>>((acc, a) => {
    (acc[a.date] = acc[a.date] ?? []).push(a);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-900">손실 알림 이력</h1>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing}
              className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition"
            >
              {clearing ? "삭제 중..." : "전체 삭제"}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-16">불러오는 중...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
            <p className="text-gray-400 text-sm">손실 알림 이력이 없습니다.</p>
            <p className="text-gray-300 text-xs mt-1">평일 장중 5분 간격으로 보유 종목을 점검합니다.</p>
          </div>
        ) : (
          dates.map((date) => (
            <div key={date} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{date}</span>
                <span className="text-xs text-gray-400">{grouped[date].length}건</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {grouped[date].map((a, i) => (
                  <li key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.code} · {fmtDatetime(a.alertedAt)} · 기준 -{a.threshold}%
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-blue-500">
                        {a.lossRate.toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-400">
                        {a.price.toLocaleString()}원
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
