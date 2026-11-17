import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
} from 'lucide-react';
import {
  Equipment,
  FAULT_CATEGORIES,
  FaultCategory,
  formatFirestoreTime,
  InspectionRecord,
  RepairUrgency,
  ShiftType,
  WORKSHOP_INSPECTION_TEMPLATES,
  WORKSHOPS,
  Workshop,
} from '../types/eam';
import { HealthStatusIndicator } from './StatusPrimitives';

interface InspectionsViewProps {
  equipment: Equipment[];
  inspections: InspectionRecord[];
  initialEquipment?: Equipment | null;
  onSubmitInspection: (params: {
    equipment: Equipment;
    shift: ShiftType;
    items: { label: string; ok: boolean }[];
    summaryNote: string;
    createOrderIfAbnormal: boolean;
    faultCategory: FaultCategory;
    urgency: RepairUrgency;
    faultDescription: string;
  }) => Promise<string>;
}

export function InspectionsView({
  equipment,
  inspections,
  initialEquipment,
  onSubmitInspection,
}: InspectionsViewProps) {
  const inspectableEquipment = useMemo(
    () => equipment.filter((e) => e.lifecycleStage !== 'scrapped'),
    [equipment]
  );

  const [workshopFilter, setWorkshopFilter] = useState<Workshop | 'all'>('all');
  const [selectedEquipId, setSelectedEquipId] = useState<string>(
    initialEquipment?.id || inspectableEquipment[0]?.id || ''
  );

  useEffect(() => {
    if (initialEquipment) {
      setSelectedEquipId(initialEquipment.id);
    } else if (!selectedEquipId && inspectableEquipment.length > 0) {
      setSelectedEquipId(inspectableEquipment[0].id);
    }
  }, [initialEquipment, inspectableEquipment, selectedEquipId]);

  const selectedEquipment = useMemo(
    () => inspectableEquipment.find((e) => e.id === selectedEquipId) || null,
    [inspectableEquipment, selectedEquipId]
  );

  const [shift, setShift] = useState<ShiftType>('早班');
  const [checkStates, setCheckStates] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
  ]);
  const [summaryNote, setSummaryNote] = useState('');
  const [createOrderIfAbnormal, setCreateOrderIfAbnormal] = useState(true);
  const [faultCategory, setFaultCategory] = useState<FaultCategory>('机械传动');
  const [urgency, setUrgency] = useState<RepairUrgency>('high');
  const [faultDescription, setFaultDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCheckStates([true, true, true, true, true]);
    setSummaryNote('');
    setFaultDescription('');
  }, [selectedEquipId]);

  const templateItems = selectedEquipment
    ? WORKSHOP_INSPECTION_TEMPLATES[selectedEquipment.workshop]
    : [];

  const hasAbnormal = checkStates.some((ok) => !ok);

  const filteredEquipList = useMemo(
    () =>
      inspectableEquipment
        .filter((e) => workshopFilter === 'all' || e.workshop === workshopFilter)
        .sort((a, b) => a.code.localeCompare(b.code)),
    [inspectableEquipment, workshopFilter]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setSubmitting(true);
    try {
      const items = templateItems.map((label, i) => ({
        label,
        ok: checkStates[i] ?? true,
      }));
      await onSubmitInspection({
        equipment: selectedEquipment,
        shift,
        items,
        summaryNote,
        createOrderIfAbnormal: hasAbnormal && createOrderIfAbnormal,
        faultCategory,
        urgency,
        faultDescription,
      });
      setCheckStates([true, true, true, true, true]);
      setSummaryNote('');
      setFaultDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 cols: Equipment Selector */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <h2 className="font-display text-base font-semibold text-slate-900">
              选择点检设备
            </h2>
            <select
              value={workshopFilter}
              onChange={(e) => setWorkshopFilter(e.target.value as Workshop | 'all')}
              aria-label="按车间筛选点检设备"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">全部车间 ({inspectableEquipment.length} 台)</option>
              {WORKSHOPS.map((ws) => (
                <option key={ws} value={ws}>
                  {ws}
                </option>
              ))}
            </select>
          </div>
          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {filteredEquipList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                暂无在役可点检设备
              </div>
            ) : (
              filteredEquipList.map((eq) => {
                const active = eq.id === selectedEquipId;
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => setSelectedEquipId(eq.id)}
                    className={`w-full px-4 py-3 text-left transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      active ? 'bg-emerald-50/90' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {eq.code}
                        </span>
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {eq.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {eq.workshop} · 上次：{eq.lastInspectedAt || '尚未点检'}
                      </div>
                    </div>
                    <HealthStatusIndicator status={eq.healthStatus} />
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Right 7 cols: Inspection Form */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          {!selectedEquipment ? (
            <div className="py-16 text-center text-sm text-slate-500">
              请在左侧选择一台设备开始日常点检。
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs font-mono text-slate-500">
                    {selectedEquipment.code} · {selectedEquipment.workshop} ·{' '}
                    {selectedEquipment.processSection}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900 mt-0.5">
                    {selectedEquipment.name} · 日常点检卡
                  </h3>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                  {(['早班', '中班', '夜班'] as ShiftType[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        shift === s
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2.5">
                {templateItems.map((label, idx) => {
                  const isOk = checkStates[idx] ?? true;
                  return (
                    <div
                      key={label}
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isOk
                          ? 'bg-white border-slate-200'
                          : 'bg-red-50/60 border-red-200'
                      }`}
                    >
                      <span className="text-sm text-slate-800">{label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setCheckStates((prev) =>
                              prev.map((v, i) => (i === idx ? true : v))
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border cursor-pointer whitespace-nowrap ${
                            isOk
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>正常</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCheckStates((prev) =>
                              prev.map((v, i) => (i === idx ? false : v))
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border cursor-pointer whitespace-nowrap ${
                            !isOk
                              ? 'bg-red-700 border-red-700 text-white'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>异常</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  巡检读数与补充备注
                </label>
                <input
                  type="text"
                  value={summaryNote}
                  onChange={(e) => setSummaryNote(e.target.value)}
                  placeholder="例如：夹套压力 0.12MPa 稳定，密封无渗漏"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
                />
              </div>

              {/* Abnormal direct repair trigger */}
              {hasAbnormal && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createOrderIfAbnormal}
                      onChange={(e) => setCreateOrderIfAbnormal(e.target.checked)}
                      className="rounded border-amber-400 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>检测到异常点检项 · 提交时一键直通生成故障报修工单</span>
                  </label>

                  {createOrderIfAbnormal && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          故障分类
                        </label>
                        <select
                          value={faultCategory}
                          onChange={(e) =>
                            setFaultCategory(e.target.value as FaultCategory)
                          }
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                        >
                          {FAULT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          紧急程度
                        </label>
                        <select
                          value={urgency}
                          onChange={(e) =>
                            setUrgency(e.target.value as RepairUrgency)
                          }
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                        >
                          <option value="normal">常规处理</option>
                          <option value="high">优先加急</option>
                          <option value="critical">停机紧急</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-700 mb-1">
                          异常现象详细描述
                        </label>
                        <input
                          type="text"
                          value={faultDescription}
                          onChange={(e) => setFaultDescription(e.target.value)}
                          placeholder="留空则自动带入本次勾选的异常点检项..."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>
                    {submitting
                      ? '提交保存中...'
                      : hasAbnormal && createOrderIfAbnormal
                        ? '提交点检并创建报修单'
                        : '提交今日点检记录'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Inspection History Log */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-display text-base font-semibold text-slate-900">
            车间点检流水记录 ({inspections.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4 whitespace-nowrap">设备编号与名称</th>
                <th className="py-2.5 px-4 whitespace-nowrap">车间 / 班次</th>
                <th className="py-2.5 px-4 whitespace-nowrap">点检结果</th>
                <th className="py-2.5 px-4 whitespace-nowrap">检查摘要与备注</th>
                <th className="py-2.5 px-4 whitespace-nowrap">点检人 / 时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {inspections.map((ins) => (
                <tr key={ins.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="font-mono font-semibold text-slate-900 mr-1.5">
                      {ins.equipmentCode}
                    </span>
                    <span className="text-slate-800">{ins.equipmentName}</span>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                    {ins.workshop} · {ins.shift}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {ins.overallResult === 'pass' ? (
                      <span className="text-emerald-700 font-medium">全部合格</span>
                    ) : (
                      <span className="text-red-700 font-medium">
                        发现异常
                        {ins.linkedOrderNo ? ` · 已转 ${ins.linkedOrderNo}` : ''}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 max-w-md truncate">
                    {ins.checkItemsSummary}
                    {ins.summaryNote ? ` · ${ins.summaryNote}` : ''}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {ins.inspectorName} · {formatFirestoreTime(ins.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
