import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  Wrench,
  XOctagon,
} from 'lucide-react';
import {
  HEALTH_STATUS_META,
  HealthStatus,
  LIFECYCLE_STAGES,
  LifecycleStage,
  REPAIR_STATUS_META,
  RepairStatus,
  RepairUrgency,
  URGENCY_META,
} from '../types/eam';

export function HealthStatusIndicator({ status }: { status: HealthStatus }) {
  const meta = HEALTH_STATUS_META[status];
  const Icon =
    status === 'normal'
      ? CheckCircle2
      : status === 'attention'
        ? AlertTriangle
        : status === 'repairing'
          ? Wrench
          : XOctagon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${meta.textClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{meta.label}</span>
    </span>
  );
}

export function RepairStatusTag({ status }: { status: RepairStatus }) {
  const meta = REPAIR_STATUS_META[status];
  const Icon =
    status === 'pending'
      ? AlertTriangle
      : status === 'in_progress'
        ? Wrench
        : status === 'verifying'
          ? Clock
          : CheckCircle2;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md whitespace-nowrap shrink-0 ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{meta.label}</span>
    </span>
  );
}

export function LifecycleStageText({ stage }: { stage: LifecycleStage }) {
  const found = LIFECYCLE_STAGES.find((s) => s.key === stage);
  const Icon =
    stage === 'active'
      ? CheckCircle2
      : stage === 'overhaul'
        ? Wrench
        : stage === 'sealed'
          ? PauseCircle
          : stage === 'scrapped'
            ? XOctagon
            : Clock;

  const colorClass =
    stage === 'active'
      ? 'text-emerald-700'
      : stage === 'overhaul'
        ? 'text-amber-700'
        : stage === 'scrapped'
          ? 'text-red-700'
          : 'text-slate-600';

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${colorClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{found?.label || stage}</span>
    </span>
  );
}

export function UrgencyLabel({ urgency }: { urgency: RepairUrgency }) {
  const meta = URGENCY_META[urgency];
  return (
    <span className={`text-xs font-semibold whitespace-nowrap shrink-0 ${meta.textClass}`}>
      {meta.label}
    </span>
  );
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || '系统运行异常' };
  }

  override render() {
    if (this.state.hasError) {
      let friendlyMsg = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; path?: string };
        if (parsed?.error) {
          friendlyMsg = `云端数据操作受限（${parsed.path || 'Firestore'}）：${parsed.error}`;
        }
      } catch {
        // ignore JSON parse error
      }
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8 space-y-4">
            <div className="flex items-center gap-3 text-red-700">
              <XOctagon className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold text-slate-900">系统遇到运行错误</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed break-words">{friendlyMsg}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              重新加载工作台
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
