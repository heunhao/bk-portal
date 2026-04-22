"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Side     = "BUY" | "SELL";
type Exchange = "KRX" | "NXT" | "SOR";

interface OrderType { value: string; label: string; noPrice: boolean; }
interface QuoteData {
  stockName: string; price: number; change: number;
  changeSign: string; changeRate: number; volume: number;
  upperLimit: number; lowerLimit: number;
  asks: { price: number; qty: number }[];
  bids: { price: number; qty: number }[];
}
interface BuyCondition { id: string; label: string; }
interface OrderResult  { success: boolean; orderNo?: string; message?: string; error?: string; }

// 거래소별 주문구분 목록
const ORDER_TYPES: Record<Exchange, OrderType[]> = {
  KRX: [
    { value: "00", label: "지정가",        noPrice: false },
    { value: "01", label: "시장가",        noPrice: true  },
    { value: "02", label: "조건부지정가",  noPrice: false },
    { value: "03", label: "최유리지정가",  noPrice: true  },
    { value: "04", label: "최우선지정가",  noPrice: true  },
    { value: "05", label: "장전 시간외",   noPrice: false },
    { value: "06", label: "장후 시간외",   noPrice: false },
    { value: "07", label: "시간외 단일가", noPrice: false },
    { value: "11", label: "IOC지정가",     noPrice: false },
    { value: "12", label: "FOK지정가",     noPrice: false },
    { value: "13", label: "IOC시장가",     noPrice: true  },
    { value: "14", label: "FOK시장가",     noPrice: true  },
    { value: "15", label: "IOC최유리",     noPrice: true  },
    { value: "16", label: "FOK최유리",     noPrice: true  },
    { value: "21", label: "중간가",        noPrice: true  },
    { value: "22", label: "스톱지정가",    noPrice: false },
    { value: "23", label: "중간가IOC",     noPrice: true  },
    { value: "24", label: "중간가FOK",     noPrice: true  },
  ],
  NXT: [
    { value: "00", label: "지정가",       noPrice: false },
    { value: "03", label: "최유리지정가", noPrice: true  },
    { value: "04", label: "최우선지정가", noPrice: true  },
    { value: "11", label: "IOC지정가",    noPrice: false },
    { value: "12", label: "FOK지정가",    noPrice: false },
    { value: "13", label: "IOC시장가",    noPrice: true  },
    { value: "14", label: "FOK시장가",    noPrice: true  },
    { value: "15", label: "IOC최유리",    noPrice: true  },
    { value: "16", label: "FOK최유리",    noPrice: true  },
    { value: "21", label: "중간가",       noPrice: true  },
    { value: "22", label: "스톱지정가",   noPrice: false },
    { value: "23", label: "중간가IOC",    noPrice: true  },
    { value: "24", label: "중간가FOK",    noPrice: true  },
  ],
  SOR: [], // SOR은 KRX와 동일하게 사용 (아래에서 KRX 목록 참조)
};
ORDER_TYPES.SOR = ORDER_TYPES.KRX;

const fmt = (n: number) => n.toLocaleString("ko-KR");
const REFRESH = 5000;

function TradeForm() {
  const searchParams = useSearchParams();

  // 계좌
  const [cano, setCano]     = useState("");
  const [acntPrdt, setAcnt] = useState("01");

  // 종목
  const [inputCode, setInputCode]   = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [quote, setQuote]           = useState<QuoteData | null>(null);
  const [quoteLoading, setQL]       = useState(false);
  const [quoteError, setQE]         = useState("");

  // 주문
  const [side, setSide]             = useState<Side>("BUY");
  const [exchange, setExchange]     = useState<Exchange>("KRX");
  const [orderTypeVal, setOTV]      = useState("00");
  const [price, setPrice]           = useState("");
  const [qty, setQty]               = useState("");
  const [conditionId, setCondId]    = useState("");
  const [conditions, setConds]      = useState<BuyCondition[]>([]);

  const [confirm, setConfirm]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<OrderResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentOrderTypes = ORDER_TYPES[exchange];
  const selectedOT = currentOrderTypes.find(t => t.value === orderTypeVal)
    ?? currentOrderTypes[0];
  const noPrice = selectedOT?.noPrice ?? false;

  // 거래소 변경 시 주문구분 초기화
  useEffect(() => {
    const types = ORDER_TYPES[exchange];
    if (!types.find(t => t.value === orderTypeVal)) {
      setOTV(types[0]?.value ?? "00");
    }
  }, [exchange, orderTypeVal]);

  // 계좌 정보 로드
  useEffect(() => {
    fetch("/api/hantoo/account-info")
      .then(r => r.json())
      .then(d => { setCano(d.cano ?? ""); setAcnt(d.acntPrdtCd ?? "01"); })
      .catch(() => {});
  }, []);

  // 매수 조건 로드
  useEffect(() => {
    fetch("/api/hantoo/buy-conditions")
      .then(r => r.json())
      .then(d => setConds(d.conditions ?? []))
      .catch(() => {});
  }, []);

  // URL 파라미터
  useEffect(() => {
    const c = searchParams.get("code");
    const s = searchParams.get("side");
    if (c) { setInputCode(c); setActiveCode(c); }
    if (s === "BUY" || s === "SELL") setSide(s);
  }, [searchParams]);

  // 호가 조회
  const fetchQuote = useCallback(async (code: string) => {
    if (!code) return;
    setQL(true); setQE("");
    try {
      const res  = await fetch(`/api/hantoo/quote?code=${code}`);
      const data = await res.json();
      if (data.error) { setQE(data.error); setQuote(null); }
      else {
        setQuote(data);
        setPrice(prev => prev || String(data.price));
      }
    } catch { setQE("시세 조회 실패"); }
    finally { setQL(false); }
  }, []);

  useEffect(() => {
    if (!activeCode) return;
    fetchQuote(activeCode);
    timerRef.current = setInterval(() => fetchQuote(activeCode), REFRESH);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeCode, fetchQuote]);

  const handleSearch = () => {
    const code = inputCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) { setQE("6자리 종목코드를 입력하세요."); return; }
    setPrice(""); setActiveCode(code); setInputCode(code); setQuote(null);
  };

  const handlePriceClick = (p: number) => {
    if (noPrice) return;
    setPrice(String(p)); setOTV("00");
  };

  const stepQty   = (d: number) => setQty(v => String(Math.max(1, (parseInt(v) || 0) + d)));
  const stepPrice = (d: number) => setPrice(v => String(Math.max(1, (parseInt(v) || 0) + d)));

  const orderAmount = (parseInt(qty) || 0) * (noPrice ? 0 : (parseInt(price) || 0));

  const handleSubmit = () => {
    if (!activeCode || !qty || parseInt(qty) < 1) return;
    if (!noPrice && (!price || parseInt(price) < 1)) return;
    setConfirm(true); setResult(null);
  };

  const handleOrder = async () => {
    setLoading(true); setConfirm(false);
    try {
      const res = await fetch("/api/hantoo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeCode,
          name: quote?.stockName ?? "",
          qty,
          side,
          orderType: orderTypeVal,
          price: noPrice ? "0" : price,
          exchange,
          conditionId: side === "BUY" && conditionId ? conditionId : undefined,
        }),
      });
      const data: OrderResult = await res.json();
      setResult(data);
      if (data.success) setQty("");
    } catch { setResult({ success: false, error: "네트워크 오류" }); }
    finally { setLoading(false); }
  };

  const up   = quote && (quote.changeSign === "1" || quote.changeSign === "2");
  const down = quote && (quote.changeSign === "4" || quote.changeSign === "5");
  const priceColor = up ? "text-red-500" : down ? "text-blue-500" : "text-gray-900";

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-white">

      {/* ── 종목 검색 ── */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <input
          type="text" value={inputCode}
          onChange={e => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="종목코드 6자리" maxLength={6}
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button onClick={handleSearch}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-700">
          조회
        </button>
      </div>

      {/* ── 종목 정보 ── */}
      <div className="px-3 py-2 border-b border-gray-100 bg-white flex-shrink-0">
        {quote ? (
          <div className="flex items-start justify-between">
            <div>
              <span className="font-bold text-gray-900">{quote.stockName}</span>
              <span className="text-xs text-gray-400 font-mono ml-2">{activeCode}</span>
              {quoteLoading && <span className="text-xs text-gray-300 ml-1">·</span>}
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold ${priceColor}`}>{fmt(quote.price)}</p>
              <p className={`text-xs font-semibold ${priceColor}`}>
                {up ? "▲" : down ? "▼" : ""}
                {fmt(Math.abs(quote.change))} ({up ? "+" : down ? "-" : ""}{Math.abs(quote.changeRate).toFixed(2)}%)
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">종목을 조회하세요</p>
        )}
        {quoteError && <p className="text-xs text-red-400 mt-0.5">{quoteError}</p>}
      </div>

      {/* ── 계좌 표시 ── */}
      {cano && (
        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <span className="text-xs text-gray-500">계좌 </span>
          <span className="text-xs font-semibold text-gray-700 font-mono">{cano}-{acntPrdt}</span>
          <span className="text-xs text-gray-400 ml-1">위탁</span>
        </div>
      )}

      {/* ── 매수/매도 탭 ── */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {(["BUY", "SELL"] as Side[]).map(s => (
          <button key={s} onClick={() => { setSide(s); setResult(null); }}
            className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              side === s
                ? s === "BUY" ? "border-red-500 text-red-500 bg-red-50" : "border-blue-500 text-blue-500 bg-blue-50"
                : "border-transparent text-gray-400"
            }`}>
            {s === "BUY" ? "매수" : "매도"}
          </button>
        ))}
      </div>

      {/* ── 호가창 + 주문폼 ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* 호가창 */}
        <div className="w-[40%] border-r border-gray-100 flex flex-col overflow-y-auto text-xs bg-white">
          {quote ? (
            <>
              <div className="flex justify-between px-2 py-1 bg-red-50 text-red-400 font-semibold sticky top-0 z-10 text-[10px]">
                <span>상한가</span><span>{fmt(quote.upperLimit)}</span>
              </div>
              {quote.asks.map((a, i) => (
                <button key={i} onClick={() => handlePriceClick(a.price)}
                  className={`flex justify-between items-center px-2 py-1.5 border-b border-gray-50 w-full transition-colors ${
                    !noPrice && price === String(a.price) ? "bg-red-100" : "bg-red-50/30 hover:bg-red-50"
                  }`}>
                  <span className="text-gray-400 tabular-nums">{fmt(a.qty)}</span>
                  <span className="text-red-500 font-semibold tabular-nums">{fmt(a.price)}</span>
                </button>
              ))}
              <div className={`mx-1 my-0.5 text-center py-1 rounded text-sm font-bold ${
                up ? "bg-red-500 text-white" : down ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {fmt(quote.price)}
              </div>
              {quote.bids.map((b, i) => (
                <button key={i} onClick={() => handlePriceClick(b.price)}
                  className={`flex justify-between items-center px-2 py-1.5 border-b border-gray-50 w-full transition-colors ${
                    !noPrice && price === String(b.price) ? "bg-blue-100" : "bg-blue-50/30 hover:bg-blue-50"
                  }`}>
                  <span className="text-blue-500 font-semibold tabular-nums">{fmt(b.price)}</span>
                  <span className="text-gray-400 tabular-nums">{fmt(b.qty)}</span>
                </button>
              ))}
              <div className="flex justify-between px-2 py-1 bg-blue-50 text-blue-400 font-semibold text-[10px]">
                <span>하한가</span><span>{fmt(quote.lowerLimit)}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-300 text-[10px] text-center px-2">
              종목 조회 후<br/>호가 표시
            </div>
          )}
        </div>

        {/* 주문폼 */}
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* 주문 결과 */}
          {result && (
            <div className={`mx-3 mt-2 rounded-xl p-3 text-xs ${
              result.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
            }`}>
              {result.success ? (
                <>
                  <p className="font-semibold text-emerald-700">✓ 주문 접수완료</p>
                  <p className="text-emerald-600 mt-0.5">주문번호: {result.orderNo}</p>
                  <button onClick={() => setResult(null)} className="mt-1 text-emerald-600 underline">닫기</button>
                </>
              ) : (
                <>
                  <p className="font-semibold text-red-600">✗ 주문 실패</p>
                  <p className="text-red-500 mt-0.5">{result.error}</p>
                  <button onClick={() => setResult(null)} className="mt-1 text-red-500 underline">닫기</button>
                </>
              )}
            </div>
          )}

          <div className="flex-1 px-3 pt-2 pb-2 space-y-3">

            {/* 거래소 구분 */}
            <div>
              <p className="text-[10px] text-gray-400 mb-1">거래소</p>
              <div className="flex gap-1">
                {(["KRX", "NXT", "SOR"] as Exchange[]).map(ex => (
                  <button key={ex} onClick={() => setExchange(ex)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold border transition-all ${
                      exchange === ex
                        ? "border-gray-800 bg-gray-800 text-white"
                        : "border-gray-300 text-gray-500"
                    }`}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* 주문구분 */}
            <div>
              <p className="text-[10px] text-gray-400 mb-1">주문구분</p>
              <select
                value={orderTypeVal}
                onChange={e => setOTV(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {currentOrderTypes.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.value} {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 주문단가 */}
            <div>
              <p className="text-[10px] text-gray-400 mb-1">주문단가 (원)</p>
              <div className={`flex items-center border rounded-lg overflow-hidden ${
                noPrice ? "bg-gray-100 border-gray-200" : "bg-white border-gray-300"
              }`}>
                <button onClick={() => stepPrice(-100)} disabled={noPrice}
                  className="px-3 py-2 text-gray-500 hover:bg-gray-50 disabled:opacity-20 font-bold text-base">−</button>
                <input type="number" value={noPrice ? "" : price}
                  onChange={e => setPrice(e.target.value)}
                  disabled={noPrice}
                  placeholder={noPrice ? "자동(0)" : "0"}
                  className="flex-1 text-center text-sm font-semibold text-gray-900 bg-transparent focus:outline-none py-2 disabled:text-gray-400"
                />
                <button onClick={() => stepPrice(100)} disabled={noPrice}
                  className="px-3 py-2 text-gray-500 hover:bg-gray-50 disabled:opacity-20 font-bold text-base">+</button>
              </div>
            </div>

            {/* 주문수량 */}
            <div>
              <p className="text-[10px] text-gray-400 mb-1">주문수량 (주)</p>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                <button onClick={() => stepQty(-1)}
                  className="px-3 py-2 text-gray-500 hover:bg-gray-50 font-bold text-base">−</button>
                <input type="number" value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="0" min={1}
                  className="flex-1 text-center text-sm font-semibold text-gray-900 focus:outline-none py-2"
                />
                <button onClick={() => stepQty(1)}
                  className="px-3 py-2 text-gray-500 hover:bg-gray-50 font-bold text-base">+</button>
              </div>
            </div>

            {/* 주문금액 */}
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">주문금액</span>
                <span className="font-semibold text-gray-800">
                  {!noPrice && orderAmount > 0 ? `${fmt(orderAmount)}원` : "—"}
                </span>
              </div>
            </div>

            {/* 매수 사유 */}
            {side === "BUY" && conditions.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5">매수 사유</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setCondId("")}
                    className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${
                      conditionId === "" ? "border-gray-500 bg-gray-100 text-gray-700" : "border-gray-200 text-gray-400"
                    }`}>미선택</button>
                  {conditions.map(c => (
                    <button key={c.id} onClick={() => setCondId(c.id)}
                      className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${
                        conditionId === c.id ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-400"
                      }`}>{c.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 주문 버튼 */}
          <div className="px-3 pb-4 pt-1 flex-shrink-0">
            <button onClick={handleSubmit}
              disabled={loading || !activeCode || !qty}
              className={`w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 ${
                side === "BUY"
                  ? "bg-red-500 hover:bg-red-600 active:bg-red-700"
                  : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
              }`}>
              {loading ? "처리 중..." : side === "BUY" ? "현금매수" : "현금매도"}
            </button>
          </div>
        </div>
      </div>

      {/* ── 확인 모달 ── */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-bold text-white ${side === "BUY" ? "bg-red-500" : "bg-blue-500"}`}>
                {side === "BUY" ? "매수" : "매도"}
              </span>
              <h2 className="font-bold text-gray-900">최종 주문 확인</h2>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
              {[
                ["종목",   `${quote?.stockName ?? "—"} (${activeCode})`],
                ["계좌",   `${cano}-${acntPrdt}`],
                ["거래소", exchange],
                ["주문구분", `${selectedOT?.value} ${selectedOT?.label}`],
                ["수량",   `${fmt(parseInt(qty) || 0)}주`],
                ["단가",   noPrice ? "자동(0원)" : `${fmt(parseInt(price) || 0)}원`],
                ...(!noPrice && orderAmount > 0 ? [["주문금액", `${fmt(orderAmount)}원`]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirm(false)}
                className="py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleOrder} disabled={loading}
                className={`py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${
                  side === "BUY" ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
                }`}>
                {loading ? "처리 중..." : side === "BUY" ? "매수 주문" : "매도 주문"}
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
    <div className="flex flex-col h-screen bg-white">
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
