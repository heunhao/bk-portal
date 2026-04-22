"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Side      = "BUY" | "SELL";
type OrderType = "00" | "01";
type Tab       = "BUY" | "SELL";

interface QuoteData {
  stockName:  string;
  price:      number;
  change:     number;
  changeSign: string;
  changeRate: number;
  volume:     number;
  upperLimit: number;
  lowerLimit: number;
  asks: { price: number; qty: number }[];
  bids: { price: number; qty: number }[];
}

interface BuyCondition { id: string; label: string; }
interface OrderResult  { success: boolean; orderNo?: string; message?: string; error?: string; }

const fmt  = (n: number) => n.toLocaleString("ko-KR");
const REFRESH_INTERVAL = 5000;

function TradeForm() {
  const searchParams = useSearchParams();

  const [inputCode, setInputCode]   = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [quote, setQuote]           = useState<QuoteData | null>(null);
  const [quoteLoading, setQL]       = useState(false);
  const [quoteError, setQE]         = useState("");

  const [tab, setTab]               = useState<Tab>("BUY");
  const side: Side                  = tab;
  const [orderType, setOrderType]   = useState<OrderType>("00");
  const [price, setPrice]           = useState("");
  const [qty, setQty]               = useState("");
  const [conditionId, setCondId]    = useState("");
  const [conditions, setConds]      = useState<BuyCondition[]>([]);

  const [confirm, setConfirm]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<OrderResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBuy    = side === "BUY";
  const isMarket = orderType === "01";

  // 매수 조건 로드
  useEffect(() => {
    fetch("/api/hantoo/buy-conditions")
      .then(r => r.json())
      .then(d => setConds(d.conditions ?? []))
      .catch(() => {});
  }, []);

  // URL 파라미터로 초기 종목 설정
  useEffect(() => {
    const c = searchParams.get("code");
    const s = searchParams.get("side");
    if (c) { setInputCode(c); setActiveCode(c); }
    if (s === "BUY" || s === "SELL") setTab(s);
  }, [searchParams]);

  const fetchQuote = useCallback(async (code: string) => {
    if (!code) return;
    setQL(true); setQE("");
    try {
      const res  = await fetch(`/api/hantoo/quote?code=${code}`);
      const data = await res.json();
      if (data.error) { setQE(data.error); setQuote(null); }
      else {
        setQuote(data);
        if (!price) setPrice(String(data.price));
      }
    } catch { setQE("시세 조회 실패"); }
    finally { setQL(false); }
  }, [price]);

  // 종목 활성화 시 자동 갱신
  useEffect(() => {
    if (!activeCode) return;
    fetchQuote(activeCode);
    timerRef.current = setInterval(() => fetchQuote(activeCode), REFRESH_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeCode, fetchQuote]);

  const handleCodeSearch = () => {
    const code = inputCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) { setQE("6자리 종목코드를 입력하세요."); return; }
    setPrice("");
    setActiveCode(code);
    setInputCode(code);
  };

  const handlePriceClick = (p: number) => {
    setPrice(String(p));
    setOrderType("00");
  };

  const handleQtyStep = (delta: number) => {
    setQty(prev => String(Math.max(1, (parseInt(prev) || 0) + delta)));
  };
  const handlePriceStep = (delta: number) => {
    setPrice(prev => String(Math.max(1, (parseInt(prev) || 0) + delta)));
  };

  const orderAmount = (parseInt(qty) || 0) * (parseInt(price) || 0);

  const handleSubmit = () => {
    if (!activeCode || !qty || parseInt(qty) < 1) return;
    if (!isMarket && (!price || parseInt(price) < 1)) return;
    setConfirm(true);
    setResult(null);
  };

  const handleOrder = async () => {
    setLoading(true); setConfirm(false);
    try {
      const res  = await fetch("/api/hantoo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeCode,
          name: quote?.stockName ?? "",
          qty,
          side,
          orderType,
          price: isMarket ? "0" : price,
          conditionId: isBuy && conditionId ? conditionId : undefined,
        }),
      });
      const data: OrderResult = await res.json();
      setResult(data);
      if (data.success) { setQty(""); }
    } catch { setResult({ success: false, error: "네트워크 오류" }); }
    finally { setLoading(false); }
  };

  const changePositive = quote && (quote.changeSign === "1" || quote.changeSign === "2");
  const changeNegative = quote && (quote.changeSign === "4" || quote.changeSign === "5");

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── 종목 검색 바 ── */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex gap-2">
        <input
          type="text"
          value={inputCode}
          onChange={e => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={e => { if (e.key === "Enter") handleCodeSearch(); }}
          placeholder="종목코드 6자리"
          maxLength={6}
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <button
          onClick={handleCodeSearch}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition"
        >
          조회
        </button>
      </div>

      {/* ── 종목 정보 헤더 ── */}
      {quote && (
        <div className="bg-white px-3 py-2.5 border-b border-gray-100">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-bold text-gray-900 text-base">{quote.stockName}</span>
              <span className="text-xs text-gray-400 ml-2 font-mono">{activeCode}</span>
              {quoteLoading && <span className="text-xs text-gray-300 ml-2">갱신 중</span>}
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold ${changePositive ? "text-red-500" : changeNegative ? "text-blue-500" : "text-gray-900"}`}>
                {fmt(quote.price)}
              </p>
              <p className={`text-xs font-semibold ${changePositive ? "text-red-500" : changeNegative ? "text-blue-500" : "text-gray-500"}`}>
                {changePositive ? "▲" : changeNegative ? "▼" : ""}
                {fmt(Math.abs(quote.change))} ({changePositive ? "+" : changeNegative ? "-" : ""}{Math.abs(quote.changeRate).toFixed(2)}%)
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            <span>거래량 {fmt(quote.volume)}주</span>
            <span>상한 <span className="text-red-400">{fmt(quote.upperLimit)}</span></span>
            <span>하한 <span className="text-blue-400">{fmt(quote.lowerLimit)}</span></span>
          </div>
        </div>
      )}
      {quoteError && (
        <div className="px-3 py-2 text-xs text-red-500 bg-red-50 border-b border-red-100">{quoteError}</div>
      )}

      {/* ── 탭 (매수 / 매도) ── */}
      <div className="flex border-b border-gray-200 bg-white">
        {(["BUY", "SELL"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setResult(null); }}
            className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === t
                ? t === "BUY"
                  ? "border-red-500 text-red-500 bg-red-50"
                  : "border-blue-500 text-blue-500 bg-blue-50"
                : "border-transparent text-gray-400 bg-white"
            }`}
          >
            {t === "BUY" ? "매수" : "매도"}
          </button>
        ))}
      </div>

      {/* ── 메인: 호가창 + 주문폼 ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* 호가창 */}
        <div className="w-[42%] border-r border-gray-100 flex flex-col text-xs bg-white overflow-y-auto">
          {quote ? (
            <>
              {/* 상한가 */}
              <div className="flex justify-between px-2 py-1 bg-red-50 text-red-400 font-semibold sticky top-0 z-10">
                <span>상한가</span>
                <span>{fmt(quote.upperLimit)}</span>
              </div>

              {/* 매도호가 (위에서 아래로: 높은 → 낮은) */}
              {quote.asks.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handlePriceClick(a.price)}
                  className={`flex justify-between items-center px-2 py-1.5 border-b border-gray-50 w-full text-left transition-colors ${
                    price === String(a.price) ? "bg-red-100" : "bg-red-50/40 hover:bg-red-50"
                  }`}
                >
                  <span className="text-gray-400 w-16 text-right tabular-nums">{fmt(a.qty)}</span>
                  <span className="text-red-500 font-semibold tabular-nums">{fmt(a.price)}</span>
                </button>
              ))}

              {/* 현재가 */}
              <div className={`flex justify-center items-center px-2 py-1.5 font-bold text-sm border border-gray-300 mx-1 my-0.5 rounded ${
                changePositive ? "bg-red-500 text-white" : changeNegative ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
              }`}>
                {fmt(quote.price)}
              </div>

              {/* 매수호가 (위에서 아래로: 높은 → 낮은) */}
              {quote.bids.map((b, i) => (
                <button
                  key={i}
                  onClick={() => handlePriceClick(b.price)}
                  className={`flex justify-between items-center px-2 py-1.5 border-b border-gray-50 w-full text-left transition-colors ${
                    price === String(b.price) ? "bg-blue-100" : "bg-blue-50/40 hover:bg-blue-50"
                  }`}
                >
                  <span className="text-blue-500 font-semibold tabular-nums">{fmt(b.price)}</span>
                  <span className="text-gray-400 w-16 text-right tabular-nums">{fmt(b.qty)}</span>
                </button>
              ))}

              {/* 하한가 */}
              <div className="flex justify-between px-2 py-1 bg-blue-50 text-blue-400 font-semibold">
                <span>하한가</span>
                <span>{fmt(quote.lowerLimit)}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-300 text-xs px-2 text-center">
              종목 조회 후<br/>호가가 표시됩니다
            </div>
          )}
        </div>

        {/* 주문폼 */}
        <div className="flex-1 flex flex-col bg-white overflow-y-auto">

          {/* 주문 결과 */}
          {result && (
            <div className={`mx-3 mt-3 rounded-xl p-4 ${result.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              {result.success ? (
                <>
                  <p className="font-semibold text-emerald-700 text-sm">✓ 주문 접수 완료</p>
                  <p className="text-xs text-emerald-600 mt-0.5">주문번호: {result.orderNo}</p>
                  <button onClick={() => setResult(null)} className="mt-2 text-xs text-emerald-600 underline">닫기</button>
                </>
              ) : (
                <>
                  <p className="font-semibold text-red-600 text-sm">✗ 주문 실패</p>
                  <p className="text-xs text-red-500 mt-0.5">{result.error}</p>
                  <button onClick={() => setResult(null)} className="mt-2 text-xs text-red-500 underline">닫기</button>
                </>
              )}
            </div>
          )}

          <div className="flex-1 px-3 pt-3 pb-2 space-y-3">

            {/* 주문유형 */}
            <div className="flex gap-2">
              {([["00", "지정가"], ["01", "시장가"]] as [OrderType, string][]).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => { setOrderType(v); if (v === "01") setPrice(""); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    orderType === v
                      ? "border-gray-800 bg-gray-800 text-white"
                      : "border-gray-300 text-gray-500 bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 가격 */}
            <div>
              <p className="text-xs text-gray-400 mb-1">가격 (원)</p>
              <div className={`flex items-center border rounded-lg overflow-hidden ${isMarket ? "bg-gray-50" : "bg-white border-gray-300"}`}>
                <button
                  onClick={() => handlePriceStep(-100)}
                  disabled={isMarket}
                  className="px-3 py-2.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-base font-bold"
                >−</button>
                <input
                  type="number"
                  value={isMarket ? "" : price}
                  onChange={e => setPrice(e.target.value)}
                  disabled={isMarket}
                  placeholder={isMarket ? "시장가" : "0"}
                  className="flex-1 text-center text-sm font-semibold text-gray-900 bg-transparent focus:outline-none py-2.5"
                />
                <button
                  onClick={() => handlePriceStep(100)}
                  disabled={isMarket}
                  className="px-3 py-2.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-base font-bold"
                >+</button>
              </div>
            </div>

            {/* 수량 */}
            <div>
              <p className="text-xs text-gray-400 mb-1">수량 (주)</p>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => handleQtyStep(-1)}
                  className="px-3 py-2.5 text-gray-500 hover:bg-gray-100 text-base font-bold"
                >−</button>
                <input
                  type="number"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="0"
                  min={1}
                  className="flex-1 text-center text-sm font-semibold text-gray-900 focus:outline-none py-2.5"
                />
                <button
                  onClick={() => handleQtyStep(1)}
                  className="px-3 py-2.5 text-gray-500 hover:bg-gray-100 text-base font-bold"
                >+</button>
              </div>
            </div>

            {/* 최대 수량 안내 */}
            {quote && price && !isMarket && parseInt(price) > 0 && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>주문금액</span>
                  <span className="font-semibold text-gray-800">
                    {orderAmount > 0 ? `${fmt(orderAmount)}원` : "—"}
                  </span>
                </div>
              </div>
            )}

            {/* 매수 사유 */}
            {isBuy && conditions.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">매수 사유</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCondId("")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                      conditionId === "" ? "border-gray-500 bg-gray-100 text-gray-700" : "border-gray-200 text-gray-400"
                    }`}
                  >미선택</button>
                  {conditions.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCondId(c.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                        conditionId === c.id ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-400"
                      }`}
                    >{c.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 주문 버튼 */}
          <div className="px-3 pb-4 pt-2">
            <button
              onClick={handleSubmit}
              disabled={loading || !activeCode || !qty}
              className={`w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 ${
                isBuy ? "bg-red-500 hover:bg-red-600 active:bg-red-700" : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
              }`}
            >
              {loading ? "처리 중..." : isBuy ? "현금매수" : "현금매도"}
            </button>
          </div>
        </div>
      </div>

      {/* ── 최종 확인 모달 ── */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold text-white ${isBuy ? "bg-red-500" : "bg-blue-500"}`}>
                {isBuy ? "매수" : "매도"}
              </span>
              <h2 className="font-bold text-gray-900">주문 확인</h2>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
              {[
                ["종목명", quote?.stockName ?? "—"],
                ["종목코드", activeCode],
                ["수량", `${fmt(parseInt(qty) || 0)}주`],
                ["가격", isMarket ? "시장가" : `${fmt(parseInt(price) || 0)}원`],
                ...(!isMarket && orderAmount > 0 ? [["주문금액", `${fmt(orderAmount)}원`]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >취소</button>
              <button
                onClick={handleOrder}
                disabled={loading}
                className={`py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${
                  isBuy ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {loading ? "처리 중..." : isBuy ? "매수 주문" : "매도 주문"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HantooTradePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/hantoo" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900">주식 주문</h1>
        </div>
      </header>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-gray-400">로딩 중...</div>}>
        <TradeForm />
      </Suspense>
    </div>
  );
}
