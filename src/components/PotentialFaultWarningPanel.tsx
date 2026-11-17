import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  ShieldAlert,
  TimerReset,
} from 'lucide-react';
import {
  Equipment,
  formatFirestoreTime,
  RepairOrder,
} from '../types/eam';

interface PotentialFaultWarningPanelProps {
  equipment: Equipment[];
  orders: RepairOrder[];
  onSelectEquipment: (eq: Equipment) => void;
  onInspectEquipment: (eq: Equipment) => void;
}

interface MtbfRiskRow {
  equipment: Equipment;
  lastServiceLabel: string;
  lastServiceSource: string;
  elapsedDays: number;
  mtbfDays: number;
  remainingDays: number;
  usageRatioPct: number;
  riskLevel: 'critical' | 'warning' | 'safe';
  orderCount: number;
}

function parseDateMs(raw: unknown): number | null {
  if (!raw) return null;
  try {
    const d =
      typeof raw === 'object' &&
      raw !== null &&
      'toDate' in raw &&
      typeof (raw as { toDate: () => Date }).toDate === 'function'
        ? (raw as { toDate: () => Date }).toDate()
        : new Date(String(raw));
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
}

export function PotentialFaultWarningPanel({
  equipment,
  orders,
  onSelectEquipment,
  onInspectEquipment,
}: PotentialFaultWarningPanelProps) {
  const [showAll, setShowAll] = useState(false);

  const riskRows = useMemo<MtbfRiskRow[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayMs = now.getTime();

    return equipment
      .filter((eq) => eq.lifecycleStage !== 'scrapped' && eq.lifecycleStage !== 'sealed')
      .map((eq) => {
        const eqOrders = orders.filter((o) => o.equipmentId === eq.id);
        const closedOrders = eqOrders.filter((o) => o.status === 'closed');

        // Determine last maintenance / repair baseline
        // Prefer latest closed repair order if older than today, else derive from nextMaintenanceDate - cycleDays
        let baselineMs: number | null = null;
        let baselineSource = '保养排期反推';

        const nextPmMs = eq.nextMaintenanceDate
          ? parseDateMs(`${eq.nextMaintenanceDate}T00:00:00`)
          : null;

        if (closedOrders.length > 0) {
          const latestClosedMs = Math.max(
            ...closedOrders.map((o) => parseDateMs(o.updatedAt) ?? 0)
          );
          if (latestClosedMs > 0) {
            const latestDay = new Date(latestClosedMs);
            latestDay.setHours(0, 0, 0, 0);
            // If a real repair was closed before today, use it; if seeded today, blend with schedule baseline
            if (latestDay.getTime() < todayMs) {
              baselineMs = latestDay.getTime();
              baselineSource = '最近维修闭环';
            }
          }
        }

        if (baselineMs === null && nextPmMs !== null) {
          baselineMs = nextPmMs - eq.maintenanceCycleDays * 86400000;
          baselineSource =
            eqOrders.length > 0 ? '上次维保/故障记录' : '周期基准推算';
        }

        if (baselineMs === null) {
          const installMs = parseDateMs(`${eq.installDate}T00:00:00`);
          baselineMs = installMs ?? todayMs;
          baselineSource = '启用投产日期';
        }

        const baselineDate = new Date(baselineMs);
        const lastServiceLabel = `${baselineDate.getFullYear()}-${String(
          baselineDate.getMonth() + 1
        ).padStart(2, '0')}-${String(baselineDate.getDate()).padStart(2, '0')}`;

        const elapsedDays = Math.max(
          0,
          Math.round((todayMs - baselineMs) / 86400000)
        );

        // MTBF calculation: rated cycle adjusted by historical fault frequency penalty
        const faultPenalty = Math.min(0.35, eqOrders.length * 0.1);
        const mtbfDays = Math.max(
          7,
          Math.round(eq.maintenanceCycleDays * (1 - faultPenalty))
        );

        const remainingDays = mtbfDays - elapsedDays;
        const usageRatioPct = Math.min(
          100,
          Math.max(4, Math.round((elapsedDays / mtbfDays) * 100))
        );

        const riskLevel: 'critical' | 'warning' | 'safe' =
          remainingDays <= 2
            ? 'critical'
            : remainingDays <= 7
              ? 'warning'
              : 'safe';

        return {
          equipment: eq,
          lastServiceLabel,
          lastServiceSource:
            eqOrders.length > 0 && baselineSource === '最近维修闭环'
              ? `维修 ${formatFirestoreTime(closedOrders[0]?.updatedAt).slice(0, 10)}`
              : baselineSource,
          elapsedDays,
          mtbfDays,
          remainingDays,
          usageRatioPct,
          riskLevel,
          orderCount: eqOrders.length,
        };
      })
      .sort((a, b) => a.remainingDays - b.remainingDays);
  }, [equipment, orders]);

  const alertCount = riskRows.filter((r) => r.riskLevel !== 'safe').length;
  const visibleRows = showAll ? riskRows : riskRows.slice(0, 5);

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900">
                潜在故障预警看板（基于 MTBF 差值预测）
              </h2>
              {alertCount > 0 && (
                <span className="text-xs font-medium text-amber-700 font-mono tabular-nums">
                  · {alertCount} 台即将触达保养阈值
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              对比设备「距上次维修/维保运行时长」与「平均无故障时间（MTBF）」差值，提前识别高风险设备并安排预防性保养
            </p>
          </div>
        </div>

        {riskRows.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            {showAll ? '收起至高风险前 5 台' : `查看全部 ${riskRows.length} 台在役设备`}
          </button>
        )}
      </div>

      {riskRows.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          当前暂无在役可监测设备。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4 whitespace-nowrap">设备编号与车间</th>
                <th className="py-2.5 px-4 whitespace-nowrap">最近维保/维修基线</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">已无故障运行</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">核算 MTBF</th>
                <th className="py-2.5 px-4 whitespace-nowrap min-w-[200px]">
                  MTBF 裕度消耗与预警等级
                </th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">提前介入</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visibleRows.map((row) => {
                const isCritical = row.riskLevel === 'critical';
                const isWarning = row.riskLevel === 'warning';
                const barColor = isCritical
                  ? 'bg-red-600'
                  : isWarning
                    ? 'bg-amber-500'
                    : 'bg-emerald-600';
                const rowBg = isCritical
                  ? 'bg-red-50/35 hover:bg-red-50/60'
                  : isWarning
                    ? 'bg-amber-50/35 hover:bg-amber-50/60'
                    : 'hover:bg-slate-50/80';

                return (
                  <tr
                    key={row.equipment.id}
                    onClick={() => onSelectEquipment(row.equipment)}
                    className={`transition-colors cursor-pointer ${rowBg}`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900">
                          {row.equipment.code}
                        </span>
                        <span className="font-medium text-slate-900">
                          {row.equipment.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {row.equipment.workshop} · 历史故障 {row.orderCount} 次
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono tabular-nums text-slate-800">
                        {row.lastServiceLabel}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {row.lastServiceSource}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {row.elapsedDays} 天
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {row.mtbfDays} 天
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1 font-medium whitespace-nowrap ${
                            isCritical
                              ? 'text-red-700'
                              : isWarning
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                          }`}
                        >
                          {isCritical ? (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <TimerReset className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="font-mono tabular-nums">
                            {row.remainingDays <= 0
                              ? `已超出 MTBF ${Math.abs(row.remainingDays)} 天 · 急需保养`
                              : isCritical
                                ? `余 ${row.remainingDays} 天 · 逼近临界`
                                : isWarning
                                  ? `余 ${row.remainingDays} 天 · 建议预防性保养`
                                  : `裕度余 ${row.remainingDays} 天`}
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${row.usageRatioPct}%` }}
                        />
                      </div>
                    </td>

                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onInspectEquipment(row.equipment)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          isCritical || isWarning
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700'
                        }`}
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>安排点检保养</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
