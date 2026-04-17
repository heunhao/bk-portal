"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type Mode = "golden" | "dead";

interface StockResult {
  code: string;
  name: string;
  rsi: number;
  signal: number;
  price: number;
  volume: number;
  special: "O" | "X";
  ma5Break: "O" | "X";
  specCol: string;
}

interface ScanStatus {
  scanning: boolean;
  done: boolean;
  index: number;
  total: number;
  currentCode: string;
  currentName: string;
  errorMessage: string;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RsiPage() {
  const [mode, setMode] = useState<Mode>("golden");
  const [targetDate, setTargetDate] = useState(yesterday());
  const [results, setResults] = useState<StockResult[]>([]);
  const [specColLabel, setSpecColLabel] = useState("");
  const [status, setStatus] = useState<ScanStatus>({
    scanning: false,
    done: false,
    index: 0,
    total: 0,
    currentCode: "",
    currentName: "",
    errorMessage: "",
  });
  const abortRef = useRef<AbortController | null>(null);

  const handleScan = async () => {
    if (status.scanning) {
      abortRef.current?.abort();
      setStatus((s) => ({ ...s, scanning: false }));
      return;
    }

    setResults([]);
    setSpecColLabel("");
    setStatus({ scanning: true, done: false, index: 0, total: 0, currentCode: "", currentName: "", errorMessage: "" });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/rsi/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDate, mode }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        setStatus((s) => ({ ...s, scanning: false, errorMessage: err.error ?? "요청 실패" }));
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) return;

      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.replace(/^data: /, "").trim();
          if (!line) continue;

          let msg: Record<string, unknown>;
          try { msg = JSON.parse(line); } catch { continue; }

          if (msg.type === "start") {
            setStatus((s) => ({ ...s, total: msg.total as number }));
            setSpecColLabel(msg.specCol as string);
          } else if (msg.type === "scanning") {
            setStatus((s) => ({
              ...s,
              index: msg.index as number,
              currentCode: msg.code as string,
              currentName: msg.name as string,
            }));
          } else if (msg.type === "result") {
            setResults((prev) => [...prev, {
              code    : msg.code     as string,
              name    : msg.name     as string,
              rsi     : msg.rsi      as number,
              signal  : msg.signal   as number,
              price   : msg.price    as number,
              volume  : msg.volume   as number,
              special : msg.special  as "O" | "X",
              ma5Break: msg.ma5Break as "O" | "X",
              specCol : msg.specCol  as string,
            }]);
          } else if (msg.type === "done") {
            setStatus((s) => ({ ...s, scanning: false, done: true }));
          } else if (msg.type === "error") {
            setStatus((s) => ({ ...s, scanning: false, errorMessage: msg.message as string }));
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setStatus((s) => ({ ...s, scanning: false, errorMessage: "연결 오류가 발생했습니다." }));
      } else {
        setStatus((s) => ({ ...s, scanning: false }));
      }
    }
  };

  const progressPct = status.total > 0 ? Math.round((status.index / status.total) * 100) : 0;
  const isGolden = mode === "golden";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">RSI 종목 추출</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* 설정 패널 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">

          {/* 모드 선택 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">분석 모드</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => !status.scanning && setMode("golden")}
                disabled={status.scanning}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  isGolden
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                } disabled:opacity-50`}
              >
                <span className="text-2xl">📈</span>
                <div>
                  <p className={`text-sm font-semibold ${isGolden ? "text-emerald-700" : "text-gray-700"}`}>
                    골든크로스
                  </p>
                  <p className="text-xs text-gray-400">RSI가 Signal 위로 돌파 (매수)</p>
                </div>
              </button>
              <button
                onClick={() => !status.scanning && setMode("dead")}
                disabled={status.scanning}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  !isGolden
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                } disabled:opacity-50`}
              >
                <span className="text-2xl">📉</span>
                <div>
                  <p className={`text-sm font-semibold ${!isGolden ? "text-red-700" : "text-gray-700"}`}>
                    데드크로스
                  </p>
                  <p className="text-xs text-gray-400">RSI가 Signal 아래로 돌파 (매도)</p>
                </div>
              </button>
            </div>
          </div>

          {/* 날짜 + 스캔 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">분석 기준일</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  disabled={status.scanning}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400"
                />
                <button
                  onClick={() => setTargetDate(yesterday())}
                  disabled={status.scanning}
                  className="text-xs px-3 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
                >
                  어제
                </button>
                <button
                  onClick={() => setTargetDate(today())}
                  disabled={status.scanning}
                  className="text-xs px-3 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
                >
                  오늘
                </button>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleScan}
                className={`w-full sm:w-auto px-7 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  status.scanning
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : isGolden
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {status.scanning ? "중단" : "스캔 시작"}
              </button>
            </div>
          </div>
        </div>

        {/* 진행 상황 */}
        {(status.scanning || (status.done && status.total > 0)) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                {status.scanning ? "스캔 중..." : "스캔 완료"}
              </span>
              <span className="text-gray-400">
                {status.index.toLocaleString()} / {status.total.toLocaleString()} ({progressPct}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  status.done ? "bg-emerald-500" : isGolden ? "bg-emerald-500" : "bg-red-500"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {status.scanning && (
              <p className="text-xs text-gray-400 truncate">
                검색 중: {status.currentName} ({status.currentCode})
              </p>
            )}
          </div>
        )}

        {/* 오류 메시지 */}
        {status.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">{status.errorMessage}</p>
          </div>
        )}

        {/* 결과 테이블 */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">
                {isGolden ? "📈 골든크로스" : "📉 데드크로스"} 포착 종목
              </h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                isGolden ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
              }`}>
                {results.length}건
              </span>
            </div>

            {/* 데스크탑 헤더 */}
            <div className="hidden sm:grid grid-cols-[90px_1fr_70px_80px_110px_90px_90px_90px] gap-1 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
              <span>코드</span>
              <span>종목명</span>
              <span className="text-right">RSI</span>
              <span className="text-right">시그널</span>
              <span className="text-right">현재가</span>
              <span className="text-right">거래량</span>
              <span className="text-center">{specColLabel || (isGolden ? "과매도_탈출" : "과매수_진입")}</span>
              <span className="text-center">MA5양봉돌파</span>
            </div>

            <ul className="divide-y divide-gray-100">
              {results.map((s, idx) => (
                <li key={`${s.code}-${idx}`}>
                  {/* 데스크탑 */}
                  <div className="hidden sm:grid grid-cols-[90px_1fr_70px_80px_110px_90px_90px_90px] gap-1 px-5 py-3 items-center text-sm">
                    <span className="font-mono text-gray-400 text-xs">{s.code}</span>
                    <span className="font-medium text-gray-800 truncate">{s.name}</span>
                    <span className={`text-right font-semibold ${s.rsi <= 30 ? "text-red-500" : s.rsi >= 70 ? "text-orange-500" : "text-gray-700"}`}>
                      {s.rsi}
                    </span>
                    <span className="text-right text-gray-500">{s.signal}</span>
                    <span className="text-right font-semibold text-gray-800">{s.price.toLocaleString()}원</span>
                    <span className="text-right text-gray-500 text-xs">{s.volume.toLocaleString()}</span>
                    <span className={`text-center font-bold ${s.special === "O" ? (isGolden ? "text-red-500" : "text-blue-500") : "text-gray-300"}`}>
                      {s.special}
                    </span>
                    <span className={`text-center font-bold ${s.ma5Break === "O" ? "text-indigo-500" : "text-gray-300"}`}>
                      {s.ma5Break}
                    </span>
                  </div>
                  {/* 모바일 */}
                  <div className="sm:hidden flex items-center px-4 py-3.5 gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                      isGolden ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    }`}>
                      {isGolden ? "↑" : "↓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">
                        {s.code} · RSI {s.rsi} / 시그널 {s.signal}
                        {s.special === "O" && <span className={isGolden ? " · 🔴과매도탈출" : " · 🔵과매수진입"}></span>}
                        {s.ma5Break === "O" && " · 📊MA5돌파"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-800">{s.price.toLocaleString()}원</p>
                      <p className="text-xs text-gray-400">{s.volume.toLocaleString()}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 결과 없음 */}
        {status.done && results.length === 0 && !status.errorMessage && (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
            <p className="text-gray-400 text-sm">조건에 맞는 종목이 없거나 해당 날짜가 휴장일입니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}
