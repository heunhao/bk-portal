"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── 타입 정의 ─────────────────────────────────────────────

interface CheckRecord {
  id: string;
  checkTime: string;
  stockCode: string;
  stockName: string;
  holdQty: number;
  avgPrice: number;
  currentPrice: number;
  evalAmount: number;
  evalPflsAmount: number;
  evalPflsRate: number;
  sellTriggered: boolean;
}

interface OrderRecord {
  id: string;
  orderTime: string;
  stockCode: string;
  stockName: string;
  orderQty: number;
  triggerRate: number;
  orderNo: string | null;
  resultCode: string | null;
  resultMsg: string | null;
}

// ── 유틸 ─────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

function fmtDt(iso: string) {
  const d = new Date(iso);
  const ymd = d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
  const hms = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return `${ymd} ${hms}`;
}

function RateCell({ rate }: { rate: number }) {
  const color = rate >= 10
    ? "text-red-600 font-bold"
    : rate <= -8
    ? "text-blue-600 font-bold"
    : rate > 0
    ? "text-red-500"
    : rate < 0
    ? "text-blue-500"
    : "text-gray-500";
  return (
    <span className={color}>
      {rate > 0 ? "+" : ""}
      {rate.toFixed(2)}%
    </span>
  );
}

// ── 탭: 평가손익 확인 이력 ────────────────────────────────

function ChecksTab() {
  const [checks, setChecks]   = useState<CheckRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [error, setError]     = useState("");

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/hantoo/auto-sell/checks?date=${date}`);
      const data = await res.json();
      if (data.checks) setChecks(data.checks);
      else setError(data.error ?? "조회 실패");
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchChecks(); }, [fetchChecks]);

  // 체크 시간별로 그룹핑
  const grouped = checks.reduce<Record<string, CheckRecord[]>>((acc, c) => {
    const key = new Date(c.checkTime).toISOString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const times = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* 날짜 선택 */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={fetchChecks}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition"
        >
          {loading ? "조회 중..." : "조회"}
        </button>
        <span className="text-xs text-gray-400 ml-auto">
          총 {checks.length}건 ({times.length}회 확인)
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
      )}

      {/* 범례 */}
      <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">색상 안내</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-600 w-16 shrink-0">+10.00%↑</span>
            <span>익절 조건 도달 — 자동 매도 실행</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-600 w-16 shrink-0">-8.00%↓</span>
            <span>손절 조건 도달 — 자동 매도 실행</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-semibold w-16 shrink-0">+X.XX%</span>
            <span>수익 상태 (익절 기준 미달)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-semibold w-16 shrink-0">-X.XX%</span>
            <span>손실 상태 (손절 기준 미달)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-sm bg-yellow-50 border border-yellow-300 shrink-0" />
            <span>노란 배경 행 — 해당 시점에 매도 주문 실행됨</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium shrink-0">매도</span>
            <span>매도 주문이 접수된 종목</span>
          </div>
        </div>
      </div>

      {times.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-sm text-gray-400">
          해당 날짜의 확인 이력이 없습니다.
        </div>
      )}

      {times.map(t => (
        <div key={t} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{fmtDt(t)}</span>
            <span className="text-xs text-gray-400">{grouped[t].length}종목</span>
          </div>

          {/* 데스크탑 테이블 */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium">종목</th>
                  <th className="text-right px-4 py-2.5 font-medium">보유수량</th>
                  <th className="text-right px-4 py-2.5 font-medium">매입평균가</th>
                  <th className="text-right px-4 py-2.5 font-medium">현재가</th>
                  <th className="text-right px-4 py-2.5 font-medium">평가손익</th>
                  <th className="text-right px-4 py-2.5 font-medium">손익율</th>
                  <th className="text-center px-4 py-2.5 font-medium">매도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grouped[t].map(r => (
                  <tr
                    key={r.id}
                    className={r.sellTriggered ? "bg-yellow-50" : "hover:bg-gray-50"}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.stockName}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.stockCode}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(r.holdQty)}주</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(r.avgPrice)}원</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(r.currentPrice)}원</td>
                    <td className={`px-4 py-3 text-right text-xs font-semibold ${r.evalPflsAmount >= 0 ? "text-red-500" : "text-blue-500"}`}>
                      {r.evalPflsAmount >= 0 ? "+" : ""}{fmt(r.evalPflsAmount)}원
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RateCell rate={r.evalPflsRate} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.sellTriggered ? (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">매도</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <ul className="sm:hidden divide-y divide-gray-100">
            {grouped[t].map(r => (
              <li key={r.id} className={`px-4 py-3.5 ${r.sellTriggered ? "bg-yellow-50" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="font-medium text-gray-800 text-sm">{r.stockName}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{r.stockCode}</span>
                  </div>
                  {r.sellTriggered && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">매도</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{fmt(r.holdQty)}주 · 평균 {fmt(r.avgPrice)}원 · 현재 {fmt(r.currentPrice)}원</span>
                  <RateCell rate={r.evalPflsRate} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── 탭: 매도 주문 이력 ────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders]   = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hantoo/auto-sell/orders");
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
      else setError(data.error ?? "조회 실패");
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition"
        >
          {loading ? "조회 중..." : "새로고침"}
        </button>
        <span className="text-xs text-gray-400">총 {orders.length}건</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
      )}

      {orders.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-sm text-gray-400">
          매도 주문 이력이 없습니다.
        </div>
      )}

      {orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* 데스크탑 */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium">주문시각</th>
                  <th className="text-left px-4 py-3 font-medium">종목</th>
                  <th className="text-right px-4 py-3 font-medium">수량</th>
                  <th className="text-right px-4 py-3 font-medium">트리거 손익율</th>
                  <th className="text-left px-4 py-3 font-medium">주문번호</th>
                  <th className="text-center px-4 py-3 font-medium">결과</th>
                  <th className="text-left px-4 py-3 font-medium">메시지</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDt(o.orderTime)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{o.stockName}</p>
                      <p className="text-xs text-gray-400 font-mono">{o.stockCode}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(o.orderQty)}주</td>
                    <td className="px-4 py-3 text-right">
                      <RateCell rate={o.triggerRate} />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{o.orderNo ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {o.resultCode === "0" ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">성공</span>
                      ) : o.resultCode ? (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">실패</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">{o.resultMsg ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 */}
          <ul className="sm:hidden divide-y divide-gray-100">
            {orders.map(o => (
              <li key={o.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="font-medium text-gray-800 text-sm">{o.stockName}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{o.stockCode}</span>
                  </div>
                  {o.resultCode === "0" ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">성공</span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">실패</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{fmtDt(o.orderTime)} · {fmt(o.orderQty)}주</span>
                  <span>트리거: <RateCell rate={o.triggerRate} /></span>
                </div>
                {o.resultMsg && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{o.resultMsg}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────

export default function AutoSellPage() {
  const [tab, setTab] = useState<"checks" | "orders">("checks");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">자동 매도 모니터</h1>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            +10% 익절 · -8% 손절
          </span>
        </div>

        {/* 탭 */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 pb-0">
          {(["checks", "orders"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "checks" ? "평가손익 확인 이력" : "매도 주문 이력"}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* 안내 배너 */}
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5 flex flex-wrap gap-3 items-center text-sm">
          <div className="flex items-center gap-2 text-blue-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">스케줄러 실행 명령</span>
          </div>
          <code className="bg-white border border-blue-200 rounded-lg px-3 py-1 text-xs text-blue-900 font-mono">
            python python/hantoo_auto_sell.py
          </code>
          <span className="text-blue-600 text-xs">평일 14:00 ~ 15:25, 5분 간격 자동 실행</span>
        </div>

        {tab === "checks" ? <ChecksTab /> : <OrdersTab />}
      </main>
    </div>
  );
}
