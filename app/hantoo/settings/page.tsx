"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function HantooSettingsPage() {
  const [threshold, setThreshold] = useState<number>(3.0);
  const [input, setInput]         = useState("3.0");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState("");
  const [error, setError]         = useState("");

  useEffect(() => {
    fetch("/api/hantoo/settings")
      .then((r) => r.json())
      .then((d) => {
        const v = d.lossThreshold ?? 3.0;
        setThreshold(v);
        setInput(String(v));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const val = parseFloat(input);
    if (isNaN(val) || val < 0.5 || val > 30) {
      setError("0.5 ~ 30 사이의 값을 입력해주세요.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res  = await fetch("/api/hantoo/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lossThreshold: val }),
      });
      const data = await res.json();
      if (data.success) {
        setThreshold(data.lossThreshold);
        setMessage("저장되었습니다.");
      } else {
        setError(data.error ?? "저장 실패");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  const presets = [1.0, 2.0, 3.0, 5.0, 7.0, 10.0];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">모니터링 설정</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-12">불러오는 중...</div>
        ) : (
          <>
            {/* 현재 설정 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 mb-1">현재 손실 경보 기준</p>
              <p className="text-3xl font-bold text-red-500">-{threshold}%</p>
              <p className="text-xs text-gray-400 mt-1">
                보유 종목의 평가손익률이 이 값 이하로 내려가면 텔레그램으로 알림을 보냅니다.
              </p>
            </div>

            {/* 설정 변경 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <p className="text-sm font-medium text-gray-700">손실 경보 기준 변경</p>

              {/* 프리셋 버튼 */}
              <div>
                <p className="text-xs text-gray-400 mb-2">빠른 선택</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setInput(String(p)); setError(""); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        parseFloat(input) === p
                          ? "border-red-400 bg-red-50 text-red-600"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      -{p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 직접 입력 */}
              <div>
                <p className="text-xs text-gray-400 mb-2">직접 입력 (0.5 ~ 30)</p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-semibold">-</span>
                  <input
                    type="number"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setError(""); }}
                    step="0.5"
                    min="0.5"
                    max="30"
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <span className="text-gray-500 font-semibold">%</span>
                </div>
              </div>

              {error   && <p className="text-xs text-red-500">{error}</p>}
              {message && <p className="text-xs text-emerald-600">{message}</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>

            {/* 안내 */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-blue-700">모니터링 동작 안내</p>
              <p className="text-xs text-blue-600">· 평일 장중(09:00~15:30) 5분 간격으로 보유 종목 점검</p>
              <p className="text-xs text-blue-600">· 설정 손실률 도달 시 텔레그램 알림 (종목당 1일 1회)</p>
              <p className="text-xs text-blue-600">· 알림 이력은 180일 보관 후 자동 삭제</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
