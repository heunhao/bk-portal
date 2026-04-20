"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface BuyOrder {
  id: string;
  orderTime: string;
  stockCode: string;
  stockName: string;
  orderQty: number;
  refPrice: number;
  rsiValue: number;
  signalValue: number;
  orderNo: string | null;
  resultCode: string | null;
  resultMsg: string | null;
}

const fmt  = (n: number) => n.toLocaleString("ko-KR");
const fmtDt = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

export default function AutoBuyPage() {
  const [orders,  setOrders]  = useState<BuyOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [date,    setDate]    = useState(new Date().toISOString().slice(0, 10));

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`/api/hantoo/auto-buy/orders?date=${date}`);
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
      else setError(data.error ?? "조회 실패");
    } catch { setError("네트워크 오류"); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">자동 매수 이력</h1>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            RSI 골든크로스 · 15:00~15:25
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5 flex flex-wrap gap-3 items-center text-sm">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <code className="bg-white border border-blue-200 rounded-lg px-3 py-1 text-xs font-mono text-blue-900">
            python python/hantoo_auto_buy.py
          </code>
          <span className="text-blue-600 text-xs">평일 15:00 ~ 15:25, 5분 간격 자동 실행 · 텔레그램 알림 포함</span>
        </div>

        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
          <button onClick={fetchOrders} disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition">
            {loading ? "조회 중..." : "조회"}
          </button>
          <span className="ml-auto text-xs text-gray-400">총 {orders.length}건</span>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

        {orders.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-sm text-gray-400">
            해당 날짜의 자동 매수 이력이 없습니다.
          </div>
        )}

        {orders.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium">주문시각</th>
                    <th className="text-left px-4 py-3 font-medium">종목</th>
                    <th className="text-right px-4 py-3 font-medium">수량</th>
                    <th className="text-right px-4 py-3 font-medium">기준가</th>
                    <th className="text-right px-4 py-3 font-medium">RSI</th>
                    <th className="text-right px-4 py-3 font-medium">Signal</th>
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
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(o.refPrice)}원</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{o.rsiValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{o.signalValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{o.orderNo ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {o.resultCode === "0"
                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">성공</span>
                          : o.resultCode
                          ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">실패</span>
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={o.resultMsg ?? ""}>
                        {o.resultMsg ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="sm:hidden divide-y divide-gray-100">
              {orders.map(o => (
                <li key={o.id} className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-medium text-gray-800 text-sm">{o.stockName}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{o.stockCode}</span>
                    </div>
                    {o.resultCode === "0"
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">성공</span>
                      : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">실패</span>}
                  </div>
                  <p className="text-xs text-gray-500">{fmtDt(o.orderTime)} · {fmt(o.orderQty)}주 · {fmt(o.refPrice)}원</p>
                  <p className="text-xs text-gray-400 mt-0.5">RSI {o.rsiValue.toFixed(2)} / Signal {o.signalValue.toFixed(2)}</p>
                  {o.resultMsg && <p className="text-xs text-red-400 mt-0.5 truncate">{o.resultMsg}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
