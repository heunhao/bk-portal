import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

const services = [
  {
    href: "/ledger",
    icon: (
      <svg
        className="w-10 h-10 text-emerald-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
    label: "가계부",
    description: "수입/지출 관리",
    color: "hover:border-emerald-300 hover:bg-emerald-50",
  },
  {
    href: "/rsi",
    icon: (
      <svg
        className="w-10 h-10 text-indigo-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    label: "RSI 종목 추출",
    description: "코스피 반등 종목 스캔",
    color: "hover:border-indigo-300 hover:bg-indigo-50",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">BK Portal</h1>
          <div className="flex items-center gap-3">
            {session.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt="profile"
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-gray-700 hidden sm:block">
              {session.user?.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-gray-500 text-sm mb-6">서비스를 선택해주세요</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className={`flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 transition-all ${service.color}`}
            >
              {service.icon}
              <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm">
                  {service.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {service.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
