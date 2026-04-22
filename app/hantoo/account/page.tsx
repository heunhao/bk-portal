"use client";

import { useState, useEffect } from "react";
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
  totalEval:    string;
  stockEval:    string;
  deposit:      string;
  depositD1:    string;
  depositD2:    string;
  withdrawable: string;
  profitAmt:    string;
  profitRate:   string;
}

type Market = "통합" | "KRX" | "NXT";
const MARKETS: Market[] = ["통합", "KRX", "NXT"];

const fmt = (n: string | number) => Number(n || 0).toLocaleString("ko-KR");

function ProfitBadge({ rate }: { rate: string }) {
  const v = parseFloat(rate);
  const color = v > 0 ? "text-red-500" : v < 0 ? "text-blue-500" : "text-gray-500";
  return <span className={`font-semibold ${color}`}>{v > 0 ? "+" : ""}{v.toFixed(2)}%</span>;
}

function AmtBadge({ amt }: { amt: string }) {
  const v = parseFloat(amt);
  const color = v >= 0 ? "text-red-500" : "text-blue-500";
  return <span className={`font-semibold text-xs ${color}`}>{v >= 0 ? "+" : ""}{fmt(amt)}</span>;
}

export default function HantooAccountPage() {
  const [loading,  setLoading]  = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [error,    setError]    = useState("");
  const [market,   setMarket]   = useState<Market>("통합");
  const [showDeposit, setShowDeposit] = useState(false);

  const fetchBalance = async () => {
    setLoading(true);
    setError("");
    setHoldings([]);
    setSummary(null);
    try {
      const res  = await fetch("/api/hantoo/account", { method: "POST" });
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

  // 자동 조회
  useEffect(() => { fetchBalance(); }, []);

  const cycleMarket = () => {
    setMarket(m => MARKETS[(MARKETS.indexOf(m) + 1) % MARKETS.length]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">계좌 조회</h1>
          <div className="ml-auto flex items-center gap-2">
            {/* 시장 선택 사이클 버튼 */}
            <button
              onClick={cycleMarket}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 flex items-center gap-1"
            >
              <span className={market === "통합" ? "text-blue-600" : market === "KRX" ? "text-orange-600" : "text-purple-600"}>
                {market}
              </span>
              <span className="text-gray-400">▸</span>
            </button>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "조회 중…" : "새로고침"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading && !summary && (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">계좌 정보를 불러오는 중…</p>
          </div>
        )}

        {summary && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1">총 평가금액</p>
                <p className="font-bold text-gray-800 text-sm">{fmt(summary.totalEval)}원</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1">주식 평가금액</p>
                <p className="font-bold text-gray-800 text-sm">{fmt(summary.stockEval)}원</p>
              </div>

              {/* 예수금 (클릭하면 상세) */}
              <button
                onClick={() => setShowDeposit(true)}
                className="bg-white rounded-2xl border border-blue-200 p-4 text-left hover:bg-blue-50 transition-colors col-span-2 sm:col-span-1"
              >
                <p className="text-xs text-blue-500 mb-1 flex items-center gap-1">
                  예수금
                  <span className="text-[10px] text-blue-300">▸ 상세</span>
                </p>
                <p className="font-bold text-gray-800 text-sm">{fmt(summary.deposit)}원</p>
              </button>

              <div className="col-span-2 sm:col-span-3 bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                <p className="text-xs text-gray-400">평가손익</p>
                <div className="text-right">
                  <p className="text-sm font-bold"><ProfitBadge rate={summary.profitRate} /></p>
                  <AmtBadge amt={summary.profitAmt} />
                  <span className="text-xs text-gray-400">원</span>
                </div>
              </div>
            </div>

            {/* 보유 종목 */}
            {holdings.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800 text-sm">보유 종목</h2>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                    {holdings.length}종목
                    <span className="text-[10px] text-blue-400 ml-1">{market}</span>
                  </span>
                </div>

                {/* 데스크탑 테이블 */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-4 py-2.5 text-left">코드</th>
                        <th className="px-4 py-2.5 text-left">종목명</th>
                        <th className="px-4 py-2.5 text-right">수량</th>
                        <th className="px-4 py-2.5 text-right">평균단가</th>
                        <th className="px-4 py-2.5 text-right">현재가</th>
                        <th className="px-4 py-2.5 text-right">수익률</th>
                        <th className="px-4 py-2.5 text-right">평가손익</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {holdings.map(h => (
                        <tr key={h.code} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-gray-400 text-xs">{h.code}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{h.name}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmt(h.qty)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmt(h.avgPrice)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmt(h.currPrice)}</td>
                          <td className="px-4 py-2.5 text-right"><ProfitBadge rate={h.profitRate} /></td>
                          <td className="px-4 py-2.5 text-right"><AmtBadge amt={h.profitAmt} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 모바일 카드 */}
                <ul className="sm:hidden divide-y divide-gray-100">
                  {holdings.map(h => (
                    <li key={h.code} className="px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{h.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{h.code} · {fmt(h.qty)}주 · 평균 {fmt(h.avgPrice)}원</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-sm font-bold text-gray-800">{fmt(h.currPrice)}원</p>
                          <ProfitBadge rate={h.profitRate} />
                        </div>
                      </div>
                      <div className="mt-1.5 flex justify-end">
                        <span className="text-xs text-gray-500">평가손익 </span>
                        <AmtBadge amt={h.profitAmt} />
                        <span className="text-xs text-gray-400">원</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center">
                <p className="text-gray-400 text-sm">보유 종목이 없습니다.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* 예수금 상세 모달 */}
      {showDeposit && summary && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
          onClick={() => setShowDeposit(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-base">예수금 현황</h2>
              <button onClick={() => setShowDeposit(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {[
                { label: "오늘 예수금",   value: summary.deposit },
                { label: "D+1 예수금",   value: summary.depositD1 },
                { label: "D+2 예수금",   value: summary.depositD2 },
                { label: "출금가능액",    value: summary.withdrawable },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{fmt(value)}원</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowDeposit(false)}
              className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
