"use client";

import { useState } from "react";
import Link from "next/link";

interface ScanResult {
  code: string;
  name: string;
  price: number;
  rsi: number;
  signal: number;
  rsiDiff: number;
  ma5: number;
}

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default function RsiScanPage() {
  const [results,  setResults]  = useState<ScanResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [scanDate, setScanDate] = useState(new Date().toISOString().slice(0, 10));
  const [scanned,  setScanned]  = useState(false);

  const handleScan = async () => {
    setLoading(true);
    setError("");
    setResults([]);
    setScanned(false);
    try {
      const res  = await fetch("/api/hantoo/rsi-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: scanDate }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results ?? []);
        setScanned(true);
      } else {
        setError(data.error ?? "스캔 실패");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">RSI 골든크로스</h1>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            설정 종목 대상 스캔
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* 설명 */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">RSI 골든크로스(돌파) 조건</p>
          <div className="space-y-1.5 text-xs text-gray-500">
            <p>· RSI Cutler(14) 와 Signal(9) 의 차이가 음수 → 양수로 전환된 종목</p>
            <p>· 스캔 대상 종목은 <Link href="/hantoo/settings" className="text-blue-600 underline">설정 페이지</Link>에서 추가/삭제 가능합니다.</p>
          </div>
        </div>

        {/* 실행 */}
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">기준 날짜</p>
            <input
              type="date"
              value={scanDate}
              onChange={e => setScanDate(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <button
            onClick={handleScan}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                스캔 중...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                RSI 골든크로스
              </>
            )}
          </button>
          {scanned && (
            <span className="text-sm text-gray-500 ml-auto">
              {results.length > 0
                ? <span className="text-emerald-600 font-semibold">{results.length}종목 돌파 감지</span>
                : "돌파 종목 없음"}
            </span>
          )}
        </div>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">설정된 종목 대상으로 RSI 골든크로스 스캔 중...</p>
            <p className="text-xs text-gray-400 mt-1">종목 수에 따라 30초~2분 소요됩니다.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">{error}</div>
        )}

        {scanned && results.length === 0 && !loading && (
          <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center">
            <p className="text-gray-400 text-sm">해당 날짜에 RSI 골든크로스 조건을 만족하는 종목이 없습니다.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">RSI 골든크로스 종목</h2>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                {results.length}종목
              </span>
            </div>

            {/* 데스크탑 */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium">종목</th>
                    <th className="text-right px-4 py-3 font-medium">현재가</th>
                    <th className="text-right px-4 py-3 font-medium">5일선</th>
                    <th className="text-right px-4 py-3 font-medium">RSI</th>
                    <th className="text-right px-4 py-3 font-medium">Signal</th>
                    <th className="text-right px-4 py-3 font-medium">RSI차이</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map(r => (
                    <tr key={r.code} className="hover:bg-emerald-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.code}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(r.price)}원</td>
                      <td className="px-4 py-3 text-right text-gray-500">{fmt(r.ma5)}원</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{r.rsi.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{r.signal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          +{r.rsiDiff.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 */}
            <ul className="sm:hidden divide-y divide-gray-100">
              {results.map(r => (
                <li key={r.code} className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-semibold text-gray-800 text-sm">{r.name}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{r.code}</span>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">{fmt(r.price)}원</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    RSI <span className="text-emerald-600 font-bold">{r.rsi.toFixed(2)}</span>
                    {" "}/ Signal {r.signal.toFixed(2)} / 5일선 {fmt(r.ma5)}원
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
