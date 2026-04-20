"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Side = "BUY" | "SELL";
type OrderType = "00" | "01";

interface OrderResult {
  success: boolean;
  orderNo?: string;
  message?: string;
  error?: string;
}

interface BuyCondition {
  id: string;
  label: string;
}

function TradeForm() {
  const searchParams = useSearchParams();
  const [code, setCode]               = useState("");
  const [qty, setQty]                 = useState("");
  const [side, setSide]               = useState<Side>("BUY");
  const [orderType, setOrderType]     = useState<OrderType>("00");
  const [price, setPrice]             = useState("");
  const [conditionId, setConditionId] = useState("");
  const [conditions, setConditions]   = useState<BuyCondition[]>([]);
  const [confirm, setConfirm]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<OrderResult | null>(null);

  useEffect(() => {
    const c = searchParams.get("code");
    const n = searchParams.get("name");
    const s = searchParams.get("side");
    if (c) setCode(n ? `${n}(${c})` : c);
    if (s === "BUY" || s === "SELL") setSide(s);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/hantoo/buy-conditions")
      .then((r) => r.json())
      .then((d) => setConditions(d.conditions ?? []))
      .catch(() => {});
  }, []);

  const codeOnly = code.replace(/\D/g, "").slice(0, 6);
  const nameOnly = code.includes("(") ? code.replace(/\(\d+\)$/, "").trim() : "";

  const isBuy    = side === "BUY";
  const isMarket = orderType === "01";

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!codeOnly || codeOnly.length !== 6 || !qty.trim()) return;
    if (!isMarket && !price.trim()) return;
    setConfirm(true);
    setResult(null);
  };

  const handleOrder = async () => {
    setLoading(true);
    setConfirm(false);
    try {
      const res = await fetch("/api/hantoo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeOnly,
          name: nameOnly,
          qty,
          side,
          orderType,
          price: isMarket ? "0" : price,
          conditionId: isBuy && conditionId ? conditionId : undefined,
        }),
      });
      const data: OrderResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "네트워크 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCode(""); setQty(""); setPrice(""); setResult(null);
    setSide("BUY"); setOrderType("00"); setConditionId("");
  };

  const selectedCondition = conditions.find((c) => c.id === conditionId);

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-4">

      {/* 주문 결과 */}
      {result && (
        <div className={`rounded-2xl border p-5 ${result.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          {result.success ? (
            <>
              <p className="font-semibold text-emerald-700 text-sm mb-1">주문 접수 완료</p>
              <p className="text-xs text-emerald-600">주문번호: {result.orderNo}</p>
              <p className="text-xs text-emerald-600">{result.message}</p>
              <button onClick={reset} className="mt-3 text-xs text-emerald-600 underline">새 주문</button>
            </>
          ) : (
            <>
              <p className="font-semibold text-red-700 text-sm mb-1">주문 실패</p>
              <p className="text-xs text-red-600">{result.error}</p>
            </>
          )}
        </div>
      )}

      {!result && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">

          {/* 매수 / 매도 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">구분</p>
            <div className="grid grid-cols-2 gap-2">
              {(["BUY", "SELL"] as Side[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    side === s
                      ? s === "BUY"
                        ? "border-red-400 bg-red-50 text-red-600"
                        : "border-blue-400 bg-blue-50 text-blue-600"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {s === "BUY" ? "매수" : "매도"}
                </button>
              ))}
            </div>
          </div>

          {/* 종목코드 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">종목코드</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="예: 005930 또는 삼성전자(005930)"
              required
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {codeOnly.length > 0 && codeOnly.length !== 6 && (
              <p className="text-xs text-red-400 mt-1">6자리 종목코드가 필요합니다 (현재: {codeOnly.length}자리)</p>
            )}
          </div>

          {/* 주문수량 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">주문수량</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="주"
              min={1}
              required
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* 가격 유형 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">가격 유형</p>
            <div className="grid grid-cols-2 gap-2">
              {([["00", "지정가"], ["01", "시장가"]] as [OrderType, string][]).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setOrderType(v)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    orderType === v
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 지정가 입력 */}
          {!isMarket && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">희망 가격</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="원"
                min={1}
                required={!isMarket}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          )}

          {/* 매수 사유 (BUY only) */}
          {isBuy && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">매수 사유/조건</label>
              {conditions.length === 0 ? (
                <p className="text-xs text-gray-400">
                  <Link href="/hantoo/settings" className="text-blue-400 underline">설정</Link>에서 매수 조건을 추가하세요.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setConditionId("")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                      conditionId === ""
                        ? "border-gray-400 bg-gray-100 text-gray-700"
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    미선택
                  </button>
                  {conditions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setConditionId(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                        conditionId === c.id
                          ? "border-orange-400 bg-orange-50 text-orange-600"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-all ${
              isBuy ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isBuy ? "매수" : "매도"} 주문 확인
          </button>
        </form>
      )}

      {/* 최종 확인 모달 */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="font-bold text-gray-900 text-base">최종 주문 확인</h2>
            <div className="space-y-2 text-sm">
              {[
                ["종목코드", codeOnly],
                ["구분", isBuy ? "매수" : "매도"],
                ["수량", `${Number(qty).toLocaleString()}주`],
                ["가격", isMarket ? "시장가" : `${Number(price).toLocaleString()}원`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-semibold ${label === "구분" ? (isBuy ? "text-red-500" : "text-blue-500") : "text-gray-800"}`}>
                    {value}
                  </span>
                </div>
              ))}
              {nameOnly && (
                <div className="flex justify-between">
                  <span className="text-gray-500">종목명</span>
                  <span className="font-semibold text-gray-800">{nameOnly}</span>
                </div>
              )}
              {isBuy && selectedCondition && (
                <div className="flex justify-between">
                  <span className="text-gray-500">매수 사유</span>
                  <span className="font-semibold text-orange-600">{selectedCondition.label}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setConfirm(false)}
                className="py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleOrder}
                disabled={loading}
                className={`py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all ${
                  isBuy ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {loading ? "처리 중..." : "주문 전송"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function HantooTradePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">주식 주문</h1>
        </div>
      </header>
      <Suspense fallback={<div className="max-w-md mx-auto px-4 py-6 text-sm text-gray-400">로딩 중...</div>}>
        <TradeForm />
      </Suspense>
    </div>
  );
}
