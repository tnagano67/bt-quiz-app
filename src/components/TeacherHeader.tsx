"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/teacher", label: "ホーム" },
  { href: "/teacher/students", label: "生徒一覧" },
  { href: "/teacher/questions", label: "問題管理" },
  { href: "/teacher/grades", label: "グレード管理" },
];

export default function TeacherHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="border-b border-teal-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <h1 className="text-base font-bold text-teal-700 sm:text-lg">
          BT管理システム
          <span className="ml-2 text-xs font-normal text-teal-500">教員</span>
        </h1>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-500 hover:text-gray-700 sm:text-sm"
        >
          ログアウト
        </button>
      </div>
      <nav className="mx-auto flex max-w-5xl px-4">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 rounded-t-lg px-2 py-2 text-center text-xs font-medium transition-colors sm:flex-none sm:px-4 sm:text-sm ${
              href === "/teacher"
                ? pathname === href
                : pathname.startsWith(href)
                ? "bg-teal-50 text-teal-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
