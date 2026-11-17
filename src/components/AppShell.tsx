import React, { useState } from 'react';
import {
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Server,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_META, UserRole } from '../types/eam';

export type NavSection =
  | 'dashboard'
  | 'equipment'
  | 'repairs'
  | 'inspections'
  | 'parts'
  | 'team';

interface AppShellProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  pendingOrderCount: number;
  lowStockCount: number;
  onQuickReport: () => void;
  children: React.ReactNode;
}

const SECTION_LABELS: Record<NavSection, { label: string; group: string }> = {
  dashboard: { label: '运维总览', group: '全厂监控' },
  equipment: { label: '设备台账与生命周期', group: '资产管理' },
  repairs: { label: '故障报修闭环', group: '维保执行' },
  inspections: { label: '车间日常点检', group: '维保执行' },
  parts: { label: '备件耗材库', group: '仓储支撑' },
  team: { label: '团队角色与权限', group: '系统治理' },
};

export function AppShell({
  activeSection,
  onSelectSection,
  pendingOrderCount,
  lowStockCount,
  onQuickReport,
  children,
}: AppShellProps) {
  const { profile, effectiveRole, previewRole, setPreviewRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'dashboard', label: '运维总览', icon: LayoutDashboard },
    { id: 'equipment', label: '设备台账', icon: Server },
    { id: 'repairs', label: '故障报修', icon: Wrench, count: pendingOrderCount },
    { id: 'inspections', label: '日常点检', icon: ClipboardCheck },
    { id: 'parts', label: '备件耗材', icon: Package, count: lowStockCount },
    { id: 'team', label: '团队权限', icon: Users },
  ];

  const currentMeta = SECTION_LABELS[activeSection];
  const actualRole = profile?.role ?? 'operator';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          设备报修
        </span>
        <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
          EAM
        </span>
      </div>

      <div className="px-4 py-3 border-b border-slate-100">
        <div className="text-xs font-medium text-slate-900 truncate">
          {profile?.displayName || '工厂成员'}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="text-emerald-700 font-medium">
            {ROLE_META[effectiveRole].shortLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{profile?.workshop || '全厂统筹'}</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span
                  className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded ${
                    active
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {actualRole === 'supervisor' && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70">
          <div className="text-[11px] font-medium text-slate-500 mb-2">
            主管视角切换核验
          </div>
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-200/70 rounded-md">
            {(['supervisor', 'technician', 'operator'] as UserRole[]).map((r) => {
              const isSelected = (previewRole || actualRole) === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPreviewRole(r === actualRole ? null : r)}
                  className={`py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ROLE_META[r].shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-slate-200">
        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>退出当前账号</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-[248px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">
            <button
              type="button"
              aria-label="关闭导航菜单"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-3.5 right-3 p-1.5 text-slate-500 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary CTA on right */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="打开导航菜单"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0 truncate">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                {currentMeta.group}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {currentMeta.label}
              </span>
              {previewRole && (
                <span className="text-xs text-amber-700 font-medium whitespace-nowrap">
                  · 预览视角：{ROLE_META[previewRole].label}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onQuickReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>快速报修</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
