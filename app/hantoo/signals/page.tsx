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
const fmtN = (s: string) => { const n = parseFloat(s); return isNaN(n) ? s : fmt(Math.round(n)); };

function RateSpan({ rate }: { rate: string }) {
  const n   = parseFloat(rate);
  const cls = n > 0 ? "text-red-600" : n < 0 ? "text-blue-600" : "text-gray-600";
  return <span className={`font-semibold ${cls}`}>{n > 0 ? "+" : ""}{isNaN(n) ? rate : n.toFixed(2)}%</span>;
}

function AmtSpan({ amt }: { amt: string }) {
  const n   = parseFloat(amt);
  const cls = n >= 0 ? "text-red-600" : "text-blue-600";
  return <span className={`font-semibold ${cls}`}>{n >= 0 ? "+" : ""}{fmtN(amt)}원</span>;
}

export default function SignalsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("buy");

  // 매수 신호
  const [buyDate,    setBuyDate]    = useState(new Date().toISOString().slice(0, 10));
  const [buyResults, setBuyResults] = useState<BuySignal[]>([]);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError,   setBuyError]   = useState("");
  const [buyScanned, setBuyScanned] = useState(false);

  // 매도 신호 (보유 종목) — 마운트 시 자동 조회 (매수탭 "보유" 표시에도 사용)
  const [holdings,    setHoldings]    = useState<Holding[]>([]);
  const [heldCodes,   setHeldCodes]   = useState<Set<string>>(new Set());
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError,   setSellError]   = useState("");
  const [sellLoaded,  setSellLoaded]  = useState(false);

  const fetchSellSignals = useCallback(async () => {
    setSellLoading(true);
    setSellError("");
    try {
      const res  = await fetch("/api/hantoo/signals/sell");
      const data = await res.json();
      if (data.success) {
        const hs: Holding[] = data.holdings ?? [];
        setHoldings(hs);
        setHeldCodes(new Set(hs.map(h => h.code)));
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

  // 마운트 시 보유 종목 조회 (매수 탭 보유 표시 + 매도 탭 기본 데이터)
  useEffect(() => { fetchSellSignals(); }, [fetchSellSignals]);

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

  const isSellTarget = (rate: string) => {
    const n = parseFloat(rate);
    return !isNaN(n) && (n >= 5 || n <= -10);
  };

  const goTrade = (code: string, side: "BUY" | "SELL", qty?: string) => {
    const params = new URLSearchParams({ code, side });
    if (qty) params.set("qty", qty);
    router.push(`/hantoo/trade?${params.toString()}`);
  };

  // 정렬: buyTarget=true 먼저
  const sortedBuy = [...buyResults].sort((a, b) => {
    if (a.buyTarget === b.buyTarget) return 0;
    return a.buyTarget ? -1 : 1;
  });

  // 정렬: 매도 대상 먼저
  const sortedSell = [...holdings].sort((a, b) => {
    const at = isSellTarget(a.profitRate);
    const bt = isSellTarget(b.profitRate);
    if (at === bt) return 0;
    return at ? -1 : 1;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900">매매 신호</h1>
          <div className="ml-auto flex bg-gray-100 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
            <button onClick={() => setTab("buy")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === "buy" ? "bg-white text-red-600 shadow-sm" : "text-gray-500"
              }`}>
              매수 신호
            </button>
            <button onClick={() => setTab("sell")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === "sell" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
              }`}>
              매도 신호
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">

        {/* ════ 매수 신호 탭 ════ */}
        {tab === "buy" && (
          <>
            {/* 조회 조건 */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">기준일</label>
                <input
                  type="date" value={buyDate}
                  onChange={e => setBuyDate(e.target.value)}
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
                  style={{ colorScheme: "light" }}
                />
                <button
                  onClick={fetchBuySignals} disabled={buyLoading}
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg whitespace-nowrap"
                >
                  {buyLoading ? "조회 중…" : "조회"}
                </button>
              </div>
              {buyLoading && (
                <p className="text-xs text-gray-400 mt-2">종목 수에 따라 30초~1분 소요됩니다</p>
              )}
            </div>

            {buyError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{buyError}</div>
            )}

            {buyLoading && (
              <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
                <div className="inline-block w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-gray-500 text-sm">RSI 분석 중…</p>
                <p className="text-gray-400 text-xs mt-1">최대 1분 소요됩니다.</p>
              </div>
            )}

            {!buyScanned && !buyLoading && (
              <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
                <p className="text-gray-400 text-sm">기준일을 선택하고 조회 버튼을 눌러주세요.</p>
                <p className="text-gray-300 text-xs mt-1">설정 페이지에 등록된 종목을 대상으로 RSI 분석합니다.</p>
              </div>
            )}

            {buyScanned && !buyLoading && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    {sortedBuy.length}개 종목
                    <span className="ml-2 text-xs text-gray-400">
                      ({sortedBuy.filter(r => r.goldenCross).length}개 골든크로스)
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">기준일: {buyDate}</p>
                </div>

                {sortedBuy.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">해당 날짜에 데이터가 없습니다.</div>
                ) : (
                  <>
                    {/* 데스크탑 테이블 */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500">
                          <tr>
                            <th className="px-3 py-2.5 text-left">일시</th>
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
                          {sortedBuy.map(row => {
                            const isHeld = heldCodes.has(row.code);
                            return (
                              <tr key={row.code} className={row.goldenCross ? "bg-red-50/50" : "hover:bg-gray-50"}>
                                <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">{row.date}</td>
                                <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                                  {row.name}
                                  <span className="text-[10px] text-gray-400 font-mono ml-1">{row.code}</span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{fmt(row.close)}</td>
                                <td className={`px-3 py-2.5 text-right font-semibold ${row.rsi < 30 ? "text-blue-600" : row.rsi > 70 ? "text-red-600" : "text-gray-700"}`}>
                                  {row.rsi.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-gray-600">{row.signal.toFixed(2)}</td>
                                <td className="px-3 py-2.5 text-center">
                                  {row.goldenCross
                                    ? <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">O</span>
                                    : <span className="text-gray-300 text-xs">-</span>}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {row.buyTarget
                                    ? <span className="inline-block px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">O</span>
                                    : <span className="text-gray-300 text-xs">-</span>}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {isHeld ? (
                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg">보유</span>
                                  ) : row.buyTarget ? (
                                    <button
                                      onClick={() => goTrade(row.code, "BUY")}
                                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg"
                                    >
                                      매수
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 모바일 카드 */}
                    <ul className="sm:hidden divide-y divide-gray-100">
                      {sortedBuy.map(row => {
                        const isHeld = heldCodes.has(row.code);
                        return (
                          <li key={row.code} className={`px-4 py-3 ${row.goldenCross ? "bg-red-50/40" : ""}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{row.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{row.date}</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className="text-sm font-bold text-gray-800">{fmt(row.close)}</p>
                                {row.goldenCross && (
                                  <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">골든크로스</span>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex gap-3 text-xs text-gray-500">
                                <span>RSI <span className={`font-semibold ${row.rsi < 30 ? "text-blue-600" : row.rsi > 70 ? "text-red-600" : "text-gray-700"}`}>{row.rsi.toFixed(1)}</span></span>
                                <span>Sig <span className="font-semibold text-gray-700">{row.signal.toFixed(1)}</span></span>
                                <span className={`font-semibold ${row.buyTarget ? "text-red-600" : "text-gray-400"}`}>
                                  매수대상 {row.buyTarget ? "O" : "-"}
                                </span>
                              </div>
                              <div>
                                {isHeld ? (
                                  <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg">보유</span>
                                ) : row.buyTarget ? (
                                  <button
                                    onClick={() => goTrade(row.code, "BUY")}
                                    className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg"
                                  >
                                    매수
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ════ 매도 신호 탭 ════ */}
        {tab === "sell" && (
          <>
            {/* 기준 안내 + 새로고침 */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-red-600">+5% 이상</span> 또는{" "}
                <span className="font-semibold text-blue-600">-10% 이하</span> 종목에 매도 버튼이 표시됩니다.
              </p>
              <button
                onClick={() => { setSellLoaded(false); fetchSellSignals(); }}
                disabled={sellLoading}
                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg"
              >
                {sellLoading ? "조회 중…" : "새로고침"}
              </button>
            </div>

            {sellError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{sellError}</div>
            )}

            {sellLoading && (
              <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
                <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-gray-500 text-sm">보유 종목 조회 중…</p>
              </div>
            )}

            {sellLoaded && !sellLoading && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    보유 종목 {sortedSell.length}개
                    <span className="ml-2 text-xs text-gray-400">
                      ({sortedSell.filter(h => isSellTarget(h.profitRate)).length}개 매도 대상)
                    </span>
                  </p>
                </div>

                {sortedSell.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">보유 중인 종목이 없습니다.</div>
                ) : (
                  <>
                    {/* 데스크탑 테이블 */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500">
                          <tr>
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
                          {sortedSell.map(h => {
                            const target = isSellTarget(h.profitRate);
                            return (
                              <tr key={h.code} className={target ? "bg-blue-50/40" : "hover:bg-gray-50"}>
                                <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                                  {h.name}
                                  <span className="text-[10px] text-gray-400 font-mono ml-1">{h.code}</span>
                                </td>
                                <td className="px-3 py-2.5 text-right text-gray-700">{fmtN(h.qty)}</td>
                                <td className="px-3 py-2.5 text-right text-gray-700">{fmtN(h.avgPrice)}</td>
                                <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{fmtN(h.currPrice)}</td>
                                <td className="px-3 py-2.5 text-right"><RateSpan rate={h.profitRate} /></td>
                                <td className="px-3 py-2.5 text-right"><AmtSpan amt={h.profitAmt} /></td>
                                <td className="px-3 py-2.5 text-center">
                                  {target ? (
                                    <button
                                      onClick={() => goTrade(h.code, "SELL", h.qty)}
                                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg"
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

                    {/* 모바일 카드 */}
                    <ul className="sm:hidden divide-y divide-gray-100">
                      {sortedSell.map(h => {
                        const target = isSellTarget(h.profitRate);
                        return (
                          <li key={h.code} className={`px-4 py-3 ${target ? "bg-blue-50/30" : ""}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{h.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{h.code} · {fmtN(h.qty)}주 · 평균 {fmtN(h.avgPrice)}원</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className="text-sm font-bold text-gray-800">{fmtN(h.currPrice)}원</p>
                                <RateSpan rate={h.profitRate} />
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <AmtSpan amt={h.profitAmt} />
                              {target ? (
                                <button
                                  onClick={() => goTrade(h.code, "SELL", h.qty)}
                                  className="px-4 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg"
                                >
                                  매도
                                </button>
                              ) : (
                                <span className="text-xs text-gray-300">매도 대상 아님</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
