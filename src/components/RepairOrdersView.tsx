import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Search,
  UserCheck,
  Wrench,
} from 'lucide-react';
import {
  formatFirestoreTime,
  RepairOrder,
  RepairStatus,
  RepairUrgency,
  UserProfile,
  UserRole,
} from '../types/eam';
import { RepairStatusTag, UrgencyLabel } from './StatusPrimitives';

interface RepairOrdersViewProps {
  orders: RepairOrder[];
  users: UserProfile[];
  effectiveRole: UserRole;
  currentUserId: string;
  onQuickReport: () => void;
  onClaimOrder: (order: RepairOrder) => Promise<void>;
  onAssignOrder: (order: RepairOrder, assignee: UserProfile) => Promise<void>;
  onOpenCompletionModal: (order: RepairOrder) => void;
  onVerifyAndClose: (order: RepairOrder) => Promise<void>;
}

const STATUS_TABS: { key: RepairStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部工单' },
  { key: 'pending', label: '待接单' },
  { key: 'in_progress', label: '维修中' },
  { key: 'verifying', label: '待验收' },
  { key: 'closed', label: '已闭环' },
];

export function RepairOrdersView({
  orders,
  users,
  effectiveRole,
  onQuickReport,
  onClaimOrder,
  onAssignOrder,
  onOpenCompletionModal,
  onVerifyAndClose,
}: RepairOrdersViewProps) {
  const [statusFilter, setStatusFilter] = useState<RepairStatus | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<RepairUrgency | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

  const technicians = useMemo(
    () => users.filter((u) => u.role === 'technician' || u.role === 'supervisor'),
    [users]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (urgencyFilter !== 'all' && o.urgency !== urgencyFilter) return false;
      if (
        q &&
        !o.orderNo.toLowerCase().includes(q) &&
        !o.equipmentCode.toLowerCase().includes(q) &&
        !o.equipmentName.toLowerCase().includes(q) &&
        !o.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [orders, statusFilter, urgencyFilter, searchTerm]);

  const canHandleRepair =
    effectiveRole === 'technician' || effectiveRole === 'supervisor';
  const canVerify =
    effectiveRole === 'operator' || effectiveRole === 'supervisor';

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.key === 'all'
                  ? orders.length
                  : orders.filter((o) => o.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onQuickReport}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>发起故障报修</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索工单号、设备编号、设备名称或故障描述..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as RepairUrgency | 'all')}
            aria-label="按紧急程度筛选"
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:bg-white focus:border-emerald-600"
          >
            <option value="all">全部紧急度</option>
            <option value="critical">停机紧急</option>
            <option value="high">优先加急</option>
            <option value="normal">常规处理</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-800 mb-1">暂无匹配的故障工单</p>
            <p className="text-xs text-slate-500">
              调整状态筛选或点击右上角发起新的故障报修。
            </p>
          </div>
        ) : (
          filtered.map((order) => {
            const isBusy = busyId === order.id;
            return (
              <div key={order.id} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                      {order.orderNo}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {order.equipmentCode} {order.equipmentName}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <UrgencyLabel urgency={order.urgency} />
                  </div>
                  <RepairStatusTag status={order.status} />
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">
                  {order.description}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{order.workshop}</span>
                  <span aria-hidden="true">·</span>
                  <span>分类：{order.faultCategory}</span>
                  <span aria-hidden="true">·</span>
                  <span>报修人：{order.reporterName}</span>
                  <span aria-hidden="true">·</span>
                  <span>维修人：{order.assigneeName || '待派单'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    提报 {formatFirestoreTime(order.createdAt)}
                  </span>
                </div>

                {(order.rootCause || order.resolution) && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">故障根因</span>
                      <span className="text-slate-800">{order.rootCause || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">维修措施与结果</span>
                      <span className="text-slate-800">{order.resolution || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">停机耗时与备件消耗</span>
                      <span className="text-slate-800 font-mono tabular-nums">
                        {order.downtimeMinutes} 分钟 · {order.partsSummary || '无备件消耗'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Bar based on workflow status & role */}
                {order.status !== 'closed' && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    {order.status === 'pending' && effectiveRole === 'supervisor' && (
                      <div className="flex items-center gap-2">
                        {assigningOrderId === order.id ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              aria-label="选择维修人员"
                              defaultValue=""
                              onChange={(e) => {
                                const picked = technicians.find(
                                  (u) => u.uid === e.target.value
                                );
                                if (picked) {
                                  void runAction(order.id, () =>
                                    onAssignOrder(order, picked)
                                  );
                                  setAssigningOrderId(null);
                                }
                              }}
                              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                            >
                              <option value="" disabled>
                                选择指派人员...
                              </option>
                              {technicians.map((t) => (
                                <option key={t.uid} value={t.uid}>
                                  {t.displayName} ({t.workshop})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setAssigningOrderId(null)}
                              className="text-xs text-slate-500 px-2 py-1 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAssigningOrderId(order.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>主管派单</span>
                          </button>
                        )}
                      </div>
                    )}

                    {order.status === 'pending' && canHandleRepair && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void runAction(order.id, () => onClaimOrder(order))
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>{isBusy ? '接单中...' : '接单开始维修'}</span>
                      </button>
                    )}

                    {order.status === 'in_progress' && canHandleRepair && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onOpenCompletionModal(order)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>填写维修记录并提交验收</span>
                      </button>
                    )}

                    {order.status === 'verifying' && canVerify && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void runAction(order.id, () => onVerifyAndClose(order))
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isBusy ? '结单中...' : '试机验收并闭环'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
