import { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  Wrench,
} from 'lucide-react';
import {
  Equipment,
  LIFECYCLE_STAGES,
  LifecycleStage,
  WORKSHOPS,
  Workshop,
} from '../types/eam';
import {
  HealthStatusIndicator,
  LifecycleStageText,
} from './StatusPrimitives';

interface EquipmentLedgerViewProps {
  equipment: Equipment[];
  initialWorkshop?: Workshop | 'all';
  isSupervisor: boolean;
  onSelectEquipment: (eq: Equipment) => void;
  onInspectEquipment: (eq: Equipment) => void;
  onReportEquipment: (eq: Equipment) => void;
  onAddEquipment: () => void;
}

export function EquipmentLedgerView({
  equipment,
  initialWorkshop = 'all',
  isSupervisor,
  onSelectEquipment,
  onInspectEquipment,
  onReportEquipment,
  onAddEquipment,
}: EquipmentLedgerViewProps) {
  const [workshopFilter, setWorkshopFilter] = useState<Workshop | 'all'>(initialWorkshop);
  const [stageFilter, setStageFilter] = useState<LifecycleStage | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return equipment
      .filter((eq) => {
        if (workshopFilter !== 'all' && eq.workshop !== workshopFilter) return false;
        if (stageFilter !== 'all' && eq.lifecycleStage !== stageFilter) return false;
        if (
          q &&
          !eq.code.toLowerCase().includes(q) &&
          !eq.name.toLowerCase().includes(q) &&
          !eq.model.toLowerCase().includes(q) &&
          !eq.processSection.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [equipment, workshopFilter, stageFilter, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Workshop segmented tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setWorkshopFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                workshopFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部车间 ({equipment.length})
            </button>
            {WORKSHOPS.map((ws) => {
              const count = equipment.filter((e) => e.workshop === ws).length;
              return (
                <button
                  key={ws}
                  type="button"
                  onClick={() => setWorkshopFilter(ws)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    workshopFilter === ws
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ws} ({count})
                </button>
              );
            })}
          </div>

          {isSupervisor && (
            <button
              type="button"
              onClick={onAddEquipment}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增设备建档</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索设备编号（如 TQ-101）、名称、型号或工段..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as LifecycleStage | 'all')}
            aria-label="按生命周期阶段筛选"
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:bg-white focus:border-emerald-600"
          >
            <option value="all">全部生命周期阶段</option>
            {LIFECYCLE_STAGES.map((st) => (
              <option key={st.key} value={st.key}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* High-density Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-800 mb-1">
              未匹配到符合条件的设备
            </p>
            <p className="text-xs text-slate-500">
              尝试切换车间筛选条件或清空搜索关键词。
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4 whitespace-nowrap">设备编号</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">设备名称与型号</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">所属车间 / 工段</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">生命周期阶段</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">运行健康态</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">最近点检时间</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">快捷操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((eq) => (
                  <tr
                    key={eq.id}
                    onClick={() => onSelectEquipment(eq)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {eq.code}
                    </td>
                    <td className="py-2.5 px-4 min-w-[200px]">
                      <div className="font-medium text-slate-900">{eq.name}</div>
                      <div className="text-xs text-slate-500 font-mono truncate max-w-[240px]">
                        {eq.model} · {eq.manufacturer}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="text-xs font-medium text-slate-800">{eq.workshop}</div>
                      <div className="text-xs text-slate-500">{eq.processSection}</div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <LifecycleStageText stage={eq.lifecycleStage} />
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <HealthStatusIndicator status={eq.healthStatus} />
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                      {eq.lastInspectedAt || '尚未点检'}
                    </td>
                    <td
                      className="py-2.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onInspectEquipment(eq)}
                          disabled={eq.lifecycleStage === 'scrapped'}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>点检</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onReportEquipment(eq)}
                          disabled={eq.lifecycleStage === 'scrapped'}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>报修</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
