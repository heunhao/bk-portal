"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BuyCondition {
  id: string;
  label: string;
}

interface RsiTarget {
  id: string;
  stockCode: string;
  stockName: string;
}

export default function HantooSettingsPage() {
  // 자동 매매 ON/OFF
  const [autoTrade, setAutoTrade]       = useState(true);
  const [autoTradeLoading, setAtLoading] = useState(true);
  const [autoTradeSaving, setAtSaving]   = useState(false);
  const [autoTradeMsg, setAtMsg]         = useState("");

  // 손실 경보 설정
  const [threshold, setThreshold] = useState<number>(3.0);
  const [input, setInput]         = useState("3.0");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState("");
  const [error, setError]         = useState("");

  // 매수 조건 관리
  const [conditions, setConditions]     = useState<BuyCondition[]>([]);
  const [condLoading, setCondLoading]   = useState(true);
  const [newLabel, setNewLabel]         = useState("");
  const [addingCond, setAddingCond]     = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [condError, setCondError]       = useState("");

  // RSI 스캔 종목 관리
  const [targets, setTargets]           = useState<RsiTarget[]>([]);
  const [targetLoading, setTgLoading]   = useState(true);
  const [newCode, setNewCode]           = useState("");
  const [newName, setNewName]           = useState("");
  const [addingTarget, setAddingTarget] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [targetError, setTargetError]   = useState("");

  useEffect(() => {
    fetch("/api/hantoo/settings")
      .then((r) => r.json())
      .then((d) => {
        const v = d.lossThreshold ?? 3.0;
        setThreshold(v);
        setInput(String(v));
        setAutoTrade(d.autoTradeEnabled ?? true);
      })
      .finally(() => { setLoading(false); setAtLoading(false); });

    fetch("/api/hantoo/buy-conditions")
      .then((r) => r.json())
      .then((d) => setConditions(d.conditions ?? []))
      .finally(() => setCondLoading(false));

    fetch("/api/hantoo/auto-buy/targets")
      .then((r) => r.json())
      .then((d) => setTargets(d.targets ?? []))
      .finally(() => setTgLoading(false));
  }, []);

  // 자동 매매 ON/OFF 저장
  const handleAutoTradeToggle = async (val: boolean) => {
    setAtSaving(true);
    setAtMsg("");
    try {
      const res  = await fetch("/api/hantoo/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoTradeEnabled: val }),
      });
      const data = await res.json();
      if (data.success) {
        setAutoTrade(val);
        setAtMsg(val ? "자동 매매가 활성화되었습니다." : "자동 매매가 즉시 중단됩니다.");
      }
    } catch { setAtMsg("저장 실패"); }
    finally { setAtSaving(false); }
  };

  // RSI 종목 추가
  const handleAddTarget = async () => {
    const code = newCode.trim();
    if (!/^\d{6}$/.test(code)) { setTargetError("6자리 숫자 종목코드를 입력하세요."); return; }
    setAddingTarget(true); setTargetError("");
    try {
      const res  = await fetch("/api/hantoo/auto-buy/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockCode: code, stockName: newName.trim() }),
      });
      const data = await res.json();
      if (data.target) {
        setTargets(prev => {
          const exists = prev.find(t => t.stockCode === data.target.stockCode);
          return exists ? prev.map(t => t.stockCode === data.target.stockCode ? data.target : t)
                        : [...prev, data.target];
        });
        setNewCode(""); setNewName("");
      } else { setTargetError(data.error ?? "추가 실패"); }
    } catch { setTargetError("네트워크 오류"); }
    finally { setAddingTarget(false); }
  };

  // RSI 종목 삭제
  const handleDeleteTarget = async (code: string) => {
    setDeletingCode(code);
    try {
      await fetch(`/api/hantoo/auto-buy/targets?code=${code}`, { method: "DELETE" });
      setTargets(prev => prev.filter(t => t.stockCode !== code));
    } catch { setTargetError("삭제 실패"); }
    finally { setDeletingCode(null); }
  };

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

  const handleAddCondition = async () => {
    if (!newLabel.trim()) return;
    setAddingCond(true);
    setCondError("");
    try {
      const res  = await fetch("/api/hantoo/buy-conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const data = await res.json();
      if (data.condition) {
        setConditions((prev) => [...prev, data.condition]);
        setNewLabel("");
      } else {
        setCondError(data.error ?? "추가 실패");
      }
    } catch {
      setCondError("네트워크 오류");
    } finally {
      setAddingCond(false);
    }
  };

  const handleDeleteCondition = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/hantoo/buy-conditions/${id}`, { method: "DELETE" });
      setConditions((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setCondError("삭제 실패");
    } finally {
      setDeletingId(null);
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
          <h1 className="text-lg font-bold text-gray-900">설정</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-12">불러오는 중...</div>
        ) : (
          <>
            {/* ── 자동 매매 ON/OFF ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-gray-700">자동 매매</h2>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      자동 매수 / 매도
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      OFF 시 자동 매수·매도가 즉시 중단됩니다
                    </p>
                  </div>
                  <button
                    onClick={() => handleAutoTradeToggle(!autoTrade)}
                    disabled={autoTradeSaving}
                    className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                      autoTrade ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                        autoTrade ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${autoTrade ? "bg-emerald-500" : "bg-gray-400"}`} />
                  <span className={`text-xs font-semibold ${autoTrade ? "text-emerald-600" : "text-gray-500"}`}>
                    {autoTradeSaving ? "저장 중..." : autoTrade ? "자동 매매 활성화" : "자동 매매 중단됨"}
                  </span>
                </div>
                {autoTradeMsg && (
                  <p className={`mt-2 text-xs ${autoTrade ? "text-emerald-600" : "text-orange-500"}`}>
                    {autoTradeMsg}
                  </p>
                )}
              </div>
            </section>

            {/* ── 손실 경보 기준 ── */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-gray-700">손실 경보 기준</h2>

              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs font-medium text-gray-500 mb-1">현재 설정</p>
                <p className="text-3xl font-bold text-red-500">-{threshold}%</p>
                <p className="text-xs text-gray-400 mt-1">
                  평가손익률이 이 값 이하로 내려가면 텔레그램으로 알림을 보냅니다.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
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

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-blue-700">모니터링 동작 안내</p>
                <p className="text-xs text-blue-600">· 평일 장중(09:00~15:30) 5분 간격으로 보유 종목 점검</p>
                <p className="text-xs text-blue-600">· 설정 손실률 도달 시 텔레그램 알림 (종목당 1일 1회)</p>
              </div>
            </section>

            {/* ── 매수 사유/조건 관리 ── */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-gray-700">매수 사유/조건 관리</h2>
              <p className="text-xs text-gray-400 -mt-2">
                주문 페이지에서 매수 시 사유를 선택할 수 있습니다. 투자 분석에 활용하세요.
              </p>

              {condLoading ? (
                <div className="text-center text-gray-400 text-sm py-6">불러오는 중...</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {/* 조건 목록 */}
                  {conditions.length === 0 ? (
                    <div className="px-5 py-6 text-center text-gray-400 text-sm">
                      등록된 조건이 없습니다.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {conditions.map((c) => (
                        <li key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                          <span className="text-sm text-gray-800">{c.label}</span>
                          <button
                            onClick={() => handleDeleteCondition(c.id)}
                            disabled={deletingId === c.id}
                            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition flex-shrink-0"
                          >
                            {deletingId === c.id ? "삭제 중..." : "삭제"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* 추가 입력 */}
                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-2">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => { setNewLabel(e.target.value); setCondError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCondition(); } }}
                      placeholder="예: RSI 과매도, 골든크로스, 실적 기대..."
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                    />
                    <button
                      onClick={handleAddCondition}
                      disabled={addingCond || !newLabel.trim()}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition flex-shrink-0"
                    >
                      {addingCond ? "..." : "추가"}
                    </button>
                  </div>
                  {condError && <p className="px-5 pb-3 text-xs text-red-500">{condError}</p>}
                </div>
              )}
            </section>

            {/* ── RSI 스캔 대상 종목 관리 ── */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-gray-700">RSI 스캔 대상 종목</h2>
              <p className="text-xs text-gray-400 -mt-2">
                자동 매수 및 RSI 골든크로스 스캔의 대상이 되는 종목입니다.
              </p>

              {targetLoading ? (
                <div className="text-center text-gray-400 text-sm py-6">불러오는 중...</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {targets.length === 0 ? (
                    <div className="px-5 py-6 text-center text-gray-400 text-sm">
                      등록된 종목이 없습니다.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                      {targets.map((t) => (
                        <li key={t.stockCode} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-sm font-medium text-gray-800">{t.stockName || "—"}</span>
                            <span className="text-xs text-gray-400 font-mono ml-2">{t.stockCode}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteTarget(t.stockCode)}
                            disabled={deletingCode === t.stockCode}
                            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition flex-shrink-0"
                          >
                            {deletingCode === t.stockCode ? "삭제 중..." : "삭제"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCode}
                        onChange={(e) => { setNewCode(e.target.value); setTargetError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTarget(); } }}
                        placeholder="종목코드 (6자리)"
                        maxLength={6}
                        className="w-32 text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                      />
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTarget(); } }}
                        placeholder="종목명 (선택)"
                        className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                      />
                      <button
                        onClick={handleAddTarget}
                        disabled={addingTarget || !newCode.trim()}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition flex-shrink-0"
                      >
                        {addingTarget ? "..." : "추가"}
                      </button>
                    </div>
                    {targetError && <p className="text-xs text-red-500">{targetError}</p>}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
