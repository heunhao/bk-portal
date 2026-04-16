import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">BK Portal</h1>
        <div className="mb-6 flex items-center gap-4">
          {session.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt="profile"
              className="h-12 w-12 rounded-full"
            />
          )}
          <div>
            <p className="font-medium text-gray-900">{session.user?.name}</p>
            <p className="text-sm text-gray-500">{session.user?.email}</p>
          </div>
        </div>
        <p className="mb-6 text-sm text-gray-600">로그인되었습니다.</p>
        <LogoutButton />
      </div>
    </div>
  );
}
