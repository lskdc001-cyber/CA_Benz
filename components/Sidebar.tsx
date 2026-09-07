"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "개요",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
    group: "전체",
  },
  {
    href: "/chatbot",
    label: "AI 상담봇",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16v12H8l-4 4z" />
      </svg>
    ),
    group: "4대 자동화",
  },
  {
    href: "/content",
    label: "콘텐츠 생성",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19l4.5-1.2L20 6.3a2 2 0 0 0 0-2.8l-.5-.5a2 2 0 0 0-2.8 0L5.2 14.5z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
    ),
    group: "4대 자동화",
  },
  {
    href: "/crm",
    label: "리드/CRM",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" />
        <path d="M16 4.5c1.7.4 3 2 3 3.9 0 1.9-1.3 3.5-3 3.9" />
        <path d="M15.5 14c2.6.4 4.5 2.9 4.5 6" />
      </svg>
    ),
    group: "4대 자동화",
  },
  {
    href: "/followup",
    label: "사후관리",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    ),
    group: "4대 자동화",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  let lastGroup = "";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SA</div>
        <div className="brand-text">
          <div className="name">세일즈 비서 에이전트</div>
          <div className="sub">한성자동차 · 세일즈 컨설턴트용</div>
        </div>
      </div>

      <nav aria-label="주요 메뉴">
        {NAV_ITEMS.map((item) => {
          const showLabel = item.group !== lastGroup;
          lastGroup = item.group;
          const active = pathname === item.href;
          return (
            <div key={item.href}>
              {showLabel && <div className="nav-label">{item.group}</div>}
              <Link href={item.href} className="nav-btn" aria-current={active ? "page" : undefined}>
                {item.icon}
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="avatar">한성</div>
        <div>
          <div className="who">홍세일즈 컨설턴트</div>
          <div className="role">한성자동차 · 벤츠 세일즈</div>
        </div>
      </div>
    </aside>
  );
}
