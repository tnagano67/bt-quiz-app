"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/student", label: "ホーム" },
  { href: "/student/quiz", label: "小テスト" },
  { href: "/student/history", label: "履歴" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <h1 className="text-base font-bold text-blue-600 sm:text-lg">
          BT管理システム
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs text-gray-500 hover:text-gray-700 sm:text-sm"
        >
          ログアウト
        </button>
      </div>
      <nav aria-label="メインナビゲーション" className="mx-auto flex max-w-3xl px-4">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 rounded-t-lg px-2 py-2 text-center text-xs font-medium transition-colors sm:flex-none sm:px-4 sm:text-sm ${
              pathname === href
                ? "bg-blue-50 text-blue-600"
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
