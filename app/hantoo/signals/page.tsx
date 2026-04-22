"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "buy" | "sell";

interface BuySignal {
  date:        string;
  code:        string;
  name:        string;
  close:       number;
  rsi:         number;
  signal:      number;
  goldenCross: boolean;
  buyTarget:   boolean;
}

interface Holding {
  code:       string;
  name:       string;
  qty:        string;
  avgPrice:   string;
  currPrice:  string;
  evalAmt:    string;
  profitRate: string;
  profitAmt:  string;
}

const fmt  = (n: number) => n.toLocaleString("ko-KR");
const fmtN = (s: string) => {
  const n = parseFloat(s);
  return isNaN(n) ? s : fmt(Math.round(n));
};

function RateCell({ rate }: { rate: string }) {
  const n    = parseFloat(rate);
  const sign = n > 0 ? "+" : "";
  const cls  = n > 0 ? "text-red-600" : n < 0 ? "text-blue-600" : "text-gray-600";
  return <span className={`font-semibold ${cls}`}>{sign}{isNaN(n) ? rate : n.toFixed(2)}%</span>;
}

export default function SignalsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("buy");

  // 매수 신호 상태
  const [buyDate,    setBuyDate]    = useState(new Date().toISOString().slice(0, 10));
  const [buyResults, setBuyResults] = useState<BuySignal[]>([]);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError,   setBuyError]   = useState("");
  const [buyScanned, setBuyScanned] = useState(false);

  // 매도 신호 상태
  const [holdings,    setHoldings]    = useState<Holding[]>([]);
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError,   setSellError]   = useState("");
  const [sellLoaded,  setSellLoaded]  = useState(false);

  const fetchBuySignals = useCallback(async () => {
    setBuyLoading(true);
    setBuyError("");
    setBuyResults([]);
    setBuyScanned(false);
    try {
      const res  = await fetch(`/api/hantoo/signals/buy?date=${buyDate}`);
      const data = await res.json();
      if (data.success) {
        setBuyResults(data.results ?? []);
        setBuyScanned(true);
      } else {
        setBuyError(data.error ?? "조회 실패");
      }
    } catch {
      setBuyError("네트워크 오류가 발생했습니다.");
    } finally {
      setBuyLoading(false);
    }
  }, [buyDate]);

  const fetchSellSignals = useCallback(async () => {
    setSellLoading(true);
    setSellError("");
    try {
      const res  = await fetch("/api/hantoo/signals/sell");
      const data = await res.json();
      if (data.success) {
        setHoldings(data.holdings ?? []);
        setSellLoaded(true);
      } else {
        setSellError(data.error ?? "잔고 조회 실패");
      }
    } catch {
      setSellError("네트워크 오류가 발생했습니다.");
    } finally {
      setSellLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "sell" && !sellLoaded) fetchSellSignals();
  }, [tab, sellLoaded, fetchSellSignals]);

  const isSellTarget = (rate: string) => {
    const n = parseFloat(rate);
    return !isNaN(n) && (n >= 5 || n <= -10);
  };

  const goTrade = (code: string, side: "BUY" | "SELL") => {
    router.push(`/hantoo/trade?code=${code}&side=${side}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">매매 신호</h1>

          {/* 탭 */}
          <div className="ml-auto flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setTab("buy")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === "buy"
                  ? "bg-white text-red-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              매수 신호
            </button>
            <button
              onClick={() => setTab("sell")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === "sell"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              매도 신호
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* ── 매수 신호 탭 ── */}
        {tab === "buy" && (
          <div className="space-y-4">
            {/* 조회 조건 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">기준일</label>
                <input
                  type="date"
                  value={buyDate}
                  onChange={e => setBuyDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                <button
                  onClick={fetchBuySignals}
                  disabled={buyLoading}
                  className="px-5 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {buyLoading ? "조회 중…" : "조회"}
                </button>
                {buyLoading && (
                  <span className="text-xs text-gray-400">종목 수에 따라 30초~1분 소요됩니다</span>
                )}
              </div>
            </div>

            {/* 에러 */}
            {buyError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {buyError}
              </div>
            )}

            {/* 결과 테이블 */}
            {buyScanned && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    {buyResults.length > 0 ? `${buyResults.length}개 종목` : "조회 결과 없음"}
                    {buyResults.length > 0 && (
                      <span className="ml-2 text-xs text-gray-400">
                        ({buyResults.filter(r => r.goldenCross).length}개 골든크로스)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">기준일: {buyDate}</p>
                </div>

                {buyResults.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    해당 날짜에 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="px-3 py-2.5 text-left">일시</th>
                          <th className="px-3 py-2.5 text-left">종목코드</th>
                          <th className="px-3 py-2.5 text-left">종목명</th>
                          <th className="px-3 py-2.5 text-right">종가</th>
                          <th className="px-3 py-2.5 text-right">RSI</th>
                          <th className="px-3 py-2.5 text-right">Signal</th>
                          <th className="px-3 py-2.5 text-center">골든크로스</th>
                          <th className="px-3 py-2.5 text-center">매수대상</th>
                          <th className="px-3 py-2.5 text-center">주문</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {buyResults.map(row => (
                          <tr
                            key={row.code}
                            className={row.goldenCross ? "bg-red-50/50" : "hover:bg-gray-50"}
                          >
                            <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{row.date}</td>
                            <td className="px-3 py-2.5 font-mono text-gray-700">{row.code}</td>
                            <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{row.name}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{fmt(row.close)}</td>
                            <td className={`px-3 py-2.5 text-right font-semibold ${row.rsi < 30 ? "text-blue-600" : row.rsi > 70 ? "text-red-600" : "text-gray-700"}`}>
                              {row.rsi.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-600">{row.signal.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-center">
                              {row.goldenCross
                                ? <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">O</span>
                                : <span className="text-gray-300 text-xs">-</span>
                              }
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {row.buyTarget
                                ? <span className="inline-block px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">O</span>
                                : <span className="text-gray-300 text-xs">-</span>
                              }
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => goTrade(row.code, "BUY")}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                              >
                                매수
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!buyScanned && !buyLoading && (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <p className="text-gray-400 text-sm">기준일을 선택하고 조회 버튼을 눌러주세요.</p>
                <p className="text-gray-300 text-xs mt-1">설정 페이지에 등록된 종목을 대상으로 RSI 분석을 실행합니다.</p>
              </div>
            )}

            {buyLoading && (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <div className="inline-block w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-gray-500 text-sm">RSI 분석 중입니다…</p>
                <p className="text-gray-400 text-xs mt-1">종목 수에 따라 최대 1분이 소요됩니다.</p>
              </div>
            )}
          </div>
        )}

        {/* ── 매도 신호 탭 ── */}
        {tab === "sell" && (
          <div className="space-y-4">
            {/* 기준 안내 + 새로고침 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm text-gray-500 space-y-0.5">
                <p><span className="font-semibold text-red-600">+5% 이상</span> 또는 <span className="font-semibold text-blue-600">-10% 이하</span> 종목에 매도 버튼이 표시됩니다.</p>
              </div>
              <button
                onClick={() => { setSellLoaded(false); fetchSellSignals(); }}
                disabled={sellLoading}
                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {sellLoading ? "조회 중…" : "새로고침"}
              </button>
            </div>

            {/* 에러 */}
            {sellError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {sellError}
              </div>
            )}

            {sellLoading && (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-gray-500 text-sm">보유 종목 조회 중…</p>
              </div>
            )}

            {sellLoaded && !sellLoading && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    보유 종목 {holdings.length}개
                    {holdings.length > 0 && (
                      <span className="ml-2 text-xs text-gray-400">
                        ({holdings.filter(h => isSellTarget(h.profitRate)).length}개 매도 대상)
                      </span>
                    )}
                  </p>
                </div>

                {holdings.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">보유 중인 종목이 없습니다.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="px-3 py-2.5 text-left">종목코드</th>
                          <th className="px-3 py-2.5 text-left">종목명</th>
                          <th className="px-3 py-2.5 text-right">수량</th>
                          <th className="px-3 py-2.5 text-right">평균단가</th>
                          <th className="px-3 py-2.5 text-right">현재가</th>
                          <th className="px-3 py-2.5 text-right">수익률</th>
                          <th className="px-3 py-2.5 text-right">평가손익</th>
                          <th className="px-3 py-2.5 text-center">주문</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {holdings.map(h => {
                          const target = isSellTarget(h.profitRate);
                          return (
                            <tr key={h.code} className={target ? "bg-blue-50/40" : "hover:bg-gray-50"}>
                              <td className="px-3 py-2.5 font-mono text-gray-700">{h.code}</td>
                              <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{h.name}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700">{fmtN(h.qty)}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700">{fmtN(h.avgPrice)}</td>
                              <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{fmtN(h.currPrice)}</td>
                              <td className="px-3 py-2.5 text-right"><RateCell rate={h.profitRate} /></td>
                              <td className="px-3 py-2.5 text-right">
                                <RateCell rate={(parseFloat(h.profitAmt) >= 0 ? "+" : "") + h.profitAmt} />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {target ? (
                                  <button
                                    onClick={() => goTrade(h.code, "SELL")}
                                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    매도
                                  </button>
                                ) : (
                                  <span className="text-gray-300 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
