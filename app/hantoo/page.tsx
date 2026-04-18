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

        </div>
      </main>
    </div>
  );
}
