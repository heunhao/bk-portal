"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface CurrentStock {
  code: string;
  name: string;
  qty: number;
  price: number;
  avgPrice: number;
  lossRate: number;
  evalAmt: number;
}

interface LossAlert {
  date: string;
  code: string;
  name: string;
  lossRate: number;
  price: number;
  threshold: number;
  alertedAt: string;
}

interface SellTarget {
  code: string;
  name: string;
  qty: number;
}

const MOCK_STOCKS: CurrentStock[] = [
  { code: "005930", name: "삼성전자", qty: 10, price: 55400, avgPrice: 62000, lossRate: -10.65, evalAmt: 554000 },
  { code: "035720", name: "카카오", qty: 5, price: 38200, avgPrice: 41000, lossRate: -6.83, evalAmt: 191000 },
  { code: "066570", name: "LG전자", qty: 3, price: 87500, avgPrice: 93000, lossRate: -5.91, evalAmt: 262500 },
];

const MOCK_ALERTS: LossAlert[] = [
  { date: "2026-04-18", code: "005930", name: "삼성전자", lossRate: -10.65, price: 55400, threshold: 3.0, alertedAt: "2026-04-18T10:23:00.000Z" },
  { date: "2026-04-18", code: "035720", name: "카카오", lossRate: -6.83, price: 38200, threshold: 3.0, alertedAt: "2026-04-18T09:45:00.000Z" },
  { date: "2026-04-17", code: "066570", name: "LG전자", lossRate: -4.12, price: 89200, threshold: 3.0, alertedAt: "2026-04-17T13:55:00.000Z" },
  { date: "2026-04-17", code: "005930", name: "삼성전자", lossRate: -3.44, price: 59800, threshold: 3.0, alertedAt: "2026-04-17T11:10:00.000Z" },
];

const USE_MOCK = true;

export default function HantooAlertsPage() {
  const [threshold, setThreshold]           = useState<number>(3.0);
  const [stocks, setStocks]                 = useState<CurrentStock[]>([]);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [currentError, setCurrentError]     = useState("");

  const [alerts, setAlerts]           = useState<LossAlert[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [clearing, setClearing]       = useState(false);

  // 매도 확인 모달
  const [sellTarget, setSellTarget]   = useState<SellTarget | null>(null);
  const [selling, setSelling]         = useState(false);
  const [sellResult, setSellResult]   = useState<{ success: boolean; msg: string } | null>(null);

  const loadCurrent = useCallback(async () => {
    if (USE_MOCK) { setThreshold(3.0); setStocks(MOCK_STOCKS); return; }
    setLoadingCurrent(true);
    setCurrentError("");
    try {
      const res  = await fetch("/api/hantoo/alerts/current");
      const data = await res.json();
      if (data.error) { setCurrentError(data.error); return; }
      setThreshold(data.threshold ?? 3.0);
      setStocks(data.stocks ?? []);
    } catch {
      setCurrentError("조회 중 오류가 발생했습니다.");
    } finally {
      setLoadingCurrent(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (USE_MOCK) { setAlerts(MOCK_ALERTS); setLoadingHistory(false); return; }
    setLoadingHistory(true);
    try {
      const res  = await fetch("/api/hantoo/alerts");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadCurrent();
    loadHistory();
  }, [loadCurrent, loadHistory]);

  const handleClear = async () => {
    if (!confirm("알림 이력을 모두 삭제하시겠습니까?")) return;
    setClearing(true);
    await fetch("/api/hantoo/alerts", { method: "DELETE" });
    setAlerts([]);
    setClearing(false);
  };

  const handleSellConfirm = async () => {
    if (!sellTarget) return;
    setSelling(true);
    setSellResult(null);
    try {
      const res  = await fetch("/api/hantoo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: sellTarget.code,
          name: sellTarget.name,
          qty: String(sellTarget.qty),
          side: "SELL",
          orderType: "01",
          price: "0",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSellResult({ success: true, msg: `주문번호: ${data.orderNo ?? "-"}` });
        setStocks((prev) => prev.filter((s) => s.code !== sellTarget.code));
      } else {
        setSellResult({ success: false, msg: data.error ?? "주문 실패" });
      }
    } catch {
      setSellResult({ success: false, msg: "네트워크 오류" });
    } finally {
      setSelling(false);
    }
  };

  const closeSellModal = () => {
    setSellTarget(null);
    setSellResult(null);
  };

  const fmtDatetime = (s: string) => {
    if (s.length >= 16) return s.slice(0, 10) + " " + s.slice(11, 16);
    return s;
  };

  const grouped = alerts.reduce<Record<string, LossAlert[]>>((acc, a) => {
    (acc[a.date] = acc[a.date] ?? []).push(a);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">손실 현황</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* 실시간 현황 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">실시간 손실 현황</h2>
            <button
              onClick={loadCurrent}
              disabled={loadingCurrent}
              className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50 transition"
            >
              {loadingCurrent ? "조회 중..." : "새로고침"}
            </button>
          </div>

          {currentError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">
              {currentError}
            </div>
          ) : loadingCurrent ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-10 text-center text-gray-400 text-sm">
              조회 중...
            </div>
          ) : stocks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-10 text-center">
              <p className="text-gray-400 text-sm">손실률 -{threshold}% 이상인 종목이 없습니다.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                <span className="text-xs font-semibold text-red-600">
                  손실률 -{threshold}% 이상 종목 {stocks.length}개
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
                {stocks.map((s) => (
                  <li key={s.code} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.code} · {s.qty}주 · 평균 {s.avgPrice.toLocaleString()}원
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-base font-bold text-red-500">
                          {s.lossRate.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {s.price.toLocaleString()}원
                        </p>
                      </div>
                      <button
                        onClick={() => { setSellTarget({ code: s.code, name: s.name, qty: s.qty }); setSellResult(null); }}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition"
                      >
                        매도
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 알림 이력 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">알림 이력</h2>
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

          {loadingHistory ? (
            <div className="text-center text-gray-400 text-sm py-8">불러오는 중...</div>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-10 text-center">
              <p className="text-gray-400 text-sm">알림 이력이 없습니다.</p>
              <p className="text-gray-300 text-xs mt-1">평일 장중 5분 간격으로 점검합니다.</p>
            </div>
          ) : (
            dates.map((date) => (
              <div key={date} className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-3">
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
                        <p className="text-base font-bold text-red-500">
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
        </section>

      </main>

      {/* 매도 확인 모달 */}
      {sellTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            {sellResult ? (
              <>
                <div className={`rounded-xl p-4 ${sellResult.success ? "bg-emerald-50" : "bg-red-50"}`}>
                  <p className={`font-semibold text-sm mb-1 ${sellResult.success ? "text-emerald-700" : "text-red-700"}`}>
                    {sellResult.success ? "매도 주문 접수 완료" : "주문 실패"}
                  </p>
                  <p className={`text-xs ${sellResult.success ? "text-emerald-600" : "text-red-600"}`}>
                    {sellResult.msg}
                  </p>
                </div>
                <button
                  onClick={closeSellModal}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
                  닫기
                </button>
              </>
            ) : (
              <>
                <h2 className="font-bold text-gray-900 text-base">매도 주문 확인</h2>
                <div className="space-y-2 text-sm">
                  {[
                    ["종목", `${sellTarget.name} (${sellTarget.code})`],
                    ["수량", `${sellTarget.qty.toLocaleString()}주 전량`],
                    ["가격", "시장가"],
                    ["구분", "매도"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-500">{label}</span>
                      <span className={`font-semibold ${label === "구분" ? "text-blue-500" : "text-gray-800"}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
                  시장가로 즉시 매도 주문이 전송됩니다.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={closeSellModal}
                    className="py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSellConfirm}
                    disabled={selling}
                    className="py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 transition"
                  >
                    {selling ? "처리 중..." : "매도 주문"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
