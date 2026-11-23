import { BookOpen, LayoutDashboard, Repeat, Users, X } from 'lucide-react';
import type { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  counts: {
    students: number;
    books: number;
    activeBorrows: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Student List', icon: Users },
  { id: 'books', label: 'Book List', icon: BookOpen },
  { id: 'borrows', label: 'Borrow List', icon: Repeat },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  counts,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const getCount = (id: ActiveTab): string | null => {
    if (id === 'students') return String(counts.students);
    if (id === 'books') return String(counts.books);
    if (id === 'borrows') return String(counts.activeBorrows);
    return null;
  };

  const navContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          Campus Library
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-900 rounded-md focus-visible:outline-2 focus-visible:outline-blue-700"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-5 space-y-1" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const count = getCount(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700 ${
                isActive
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </span>
              {count !== null && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isActive ? 'text-blue-700 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-slate-200 text-xs text-slate-500">
        <p className="font-medium text-slate-700">Circulation Registry</p>
        <p className="mt-0.5">PostgreSQL Live Sync</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 min-h-screen">{navContent}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10">{navContent}</div>
        </div>
      )}
    </>
  );
}
