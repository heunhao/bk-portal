import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HantooPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">한국투자증권</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-gray-500 text-sm mb-6">서비스를 선택해주세요</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

          <Link
            href="/hantoo/account"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-blue-300 hover:bg-blue-50"
          >
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">계좌 조회</p>
              <p className="text-xs text-gray-400 mt-0.5">잔고 · 보유 종목</p>
            </div>
          </Link>

          <Link
            href="/hantoo/trade"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-orange-300 hover:bg-orange-50"
          >
            <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">주식 주문</p>
              <p className="text-xs text-gray-400 mt-0.5">매수 · 매도</p>
            </div>
          </Link>

          <Link
            href="/hantoo/history"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-emerald-300 hover:bg-emerald-50"
          >
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">거래내역</p>
              <p className="text-xs text-gray-400 mt-0.5">체결 · 주문 조회</p>
            </div>
          </Link>

          <Link
            href="/hantoo/profit"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-violet-300 hover:bg-violet-50"
          >
            <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">매매손익</p>
              <p className="text-xs text-gray-400 mt-0.5">기간별 손익 현황</p>
            </div>
          </Link>

          <Link
            href="/hantoo/signals"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-yellow-300 hover:bg-yellow-50"
          >
            <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">매매 신호</p>
              <p className="text-xs text-gray-400 mt-0.5">RSI 매수 · 보유 매도</p>
            </div>
          </Link>

          <Link
            href="/hantoo/alerts"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-red-300 hover:bg-red-50"
          >
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">손실 알림</p>
              <p className="text-xs text-gray-400 mt-0.5">경보 이력 조회</p>
            </div>
          </Link>

          <Link
            href="/hantoo/auto-sell"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-green-300 hover:bg-green-50"
          >
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">자동 매도</p>
              <p className="text-xs text-gray-400 mt-0.5">+10% / -8% 조건</p>
            </div>
          </Link>

          <Link
            href="/hantoo/auto-buy"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-blue-300 hover:bg-blue-50"
          >
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">자동 매수</p>
              <p className="text-xs text-gray-400 mt-0.5">RSI 골든크로스 · 이력</p>
            </div>
          </Link>

          <Link
            href="/hantoo/rsi-scan"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-emerald-300 hover:bg-emerald-50"
          >
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">RSI 골든크로스</p>
              <p className="text-xs text-gray-400 mt-0.5">수동 스캔</p>
            </div>
          </Link>

          <Link
            href="/hantoo/settings"
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">설정</p>
              <p className="text-xs text-gray-400 mt-0.5">자동 매매 · 경보 기준</p>
            </div>
          </Link>

        </div>
      </main>
    </div>
  );
}
