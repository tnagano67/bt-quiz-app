"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/teacher", label: "ホーム" },
  { href: "/teacher/students", label: "生徒一覧" },
  { href: "/teacher/subjects", label: "科目管理" },
  { href: "/teacher/questions", label: "問題管理" },
  { href: "/teacher/grades", label: "グレード管理" },
  { href: "/teacher/export", label: "エクスポート" },
  { href: "/teacher/teachers", label: "教員管理" },
];

function isActive(href: string, pathname: string) {
  return href === "/teacher" ? pathname === href : pathname.startsWith(href);
}

export default function TeacherHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 sm:text-sm"
          >
            ログアウト
          </button>
          {/* ハンバーガーメニュー（モバイル） */}
          <div className="relative md:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="メニュー"
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            {menuOpen && (
              <nav
                role="menu"
                aria-label="メインナビゲーション"
                className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                {navItems.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-2.5 text-sm transition-colors ${
                      isActive(href, pathname)
                        ? "bg-teal-50 font-medium text-teal-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>
      {/* デスクトップタブナビ */}
      <nav aria-label="メインナビゲーション" className="mx-auto hidden max-w-5xl px-4 md:flex">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2 text-center text-sm font-medium transition-colors ${
              isActive(href, pathname)
                ? "border-b-2 border-teal-600 text-teal-700"
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
