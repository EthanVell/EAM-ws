import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  Equipment,
  FAULT_CATEGORIES,
  FaultCategory,
  LIFECYCLE_STAGES,
  LifecycleStage,
  RepairOrder,
  RepairUrgency,
  sanitizeCode,
  SparePart,
  WORKSHOPS,
  Workshop,
} from '../types/eam';
import { CreateEquipmentPayload } from '../services/eamService';

interface QuickReportModalProps {
  open: boolean;
  equipmentList: Equipment[];
  initialEquipment: Equipment | null;
  onClose: () => void;
  onSubmit: (payload: {
    equipment: Equipment;
    faultCategory: FaultCategory;
    urgency: RepairUrgency;
    description: string;
  }) => Promise<void>;
}

export function QuickReportModal({
  open,
  equipmentList,
  initialEquipment,
  onClose,
  onSubmit,
}: QuickReportModalProps) {
  const activeEquip = equipmentList.filter((e) => e.lifecycleStage !== 'scrapped');
  const [selectedId, setSelectedId] = useState('');
  const [faultCategory, setFaultCategory] = useState<FaultCategory>('密封渗漏');
  const [urgency, setUrgency] = useState<RepairUrgency>('high');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId(initialEquipment?.id || activeEquip[0]?.id || '');
    setFaultCategory('密封渗漏');
    setUrgency('high');
    setDescription('');
  }, [open, initialEquipment, activeEquip.length]);

  if (!open) return null;

  const targetEquip = activeEquip.find((e) => e.id === selectedId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEquip || description.trim().length < 2) return;
    setSubmitting(true);
    try {
      await onSubmit({
        equipment: targetEquip,
        faultCategory,
        urgency,
        description,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-slate-900">
            发起设备故障报修
          </h3>
          <button
            type="button"
            aria-label="关闭报修弹窗"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeEquip.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            当前无可报修的在役设备，请先在设备台账初始化或新增设备。
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                故障设备
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
              >
                {activeEquip.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.code} · {eq.name} ({eq.workshop})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  故障分类
                </label>
                <select
                  value={faultCategory}
                  onChange={(e) =>
                    setFaultCategory(e.target.value as FaultCategory)
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
                >
                  {FAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  紧急程度
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as RepairUrgency)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
                >
                  <option value="normal">常规处理</option>
                  <option value="high">优先加急</option>
                  <option value="critical">停机紧急（将立即停机标识）</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                故障现象描述（至少 2 个字）
              </label>
              <textarea
                required
                minLength={2}
                maxLength={550}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请描述异常部位、报警提示或工艺参数偏离情况..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting || description.trim().length < 2}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg cursor-pointer"
              >
                {submitting ? '提交工单中...' : '提交报修工单'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface EquipmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateEquipmentPayload) => Promise<void>;
}

export function EquipmentFormModal({
  open,
  onClose,
  onSubmit,
}: EquipmentFormModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [workshop, setWorkshop] = useState<Workshop>('提取浓缩车间');
  const [processSection, setProcessSection] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [specs, setSpecs] = useState('');
  const [installDate, setInstallDate] = useState('2026-11-15');
  const [maintenanceCycleDays, setMaintenanceCycleDays] = useState(30);
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage>('active');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = sanitizeCode(code);
    if (cleanCode.length < 2 || name.trim().length < 2) return;
    setSubmitting(true);
    try {
      await onSubmit({
        code: cleanCode,
        name,
        workshop,
        processSection: processSection || '主生产工段',
        model: model || '标准型',
        manufacturer: manufacturer || '制药装备厂',
        specs,
        installDate,
        maintenanceCycleDays,
        lifecycleStage,
      });
      setCode('');
      setName('');
      setProcessSection('');
      setModel('');
      setManufacturer('');
      setSpecs('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="font-display text-base font-semibold text-slate-900">
            新增设备台账建档
          </h3>
          <button
            type="button"
            aria-label="关闭建档弹窗"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                设备编码 (大写字母/数字/短横线)
              </label>
              <input
                required
                minLength={2}
                type="text"
                value={code}
                onChange={(e) => setCode(sanitizeCode(e.target.value))}
                placeholder="如 TQ-105"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                设备名称
              </label>
              <input
                required
                minLength={2}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如 真空减压浓缩罐"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                所属中药车间
              </label>
              <select
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value as Workshop)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
              >
                {WORKSHOPS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                工序工段
              </label>
              <input
                required
                type="text"
                value={processSection}
                onChange={(e) => setProcessSection(e.target.value)}
                placeholder="如 减压浓缩工段"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                设备型号
              </label>
              <input
                required
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="如 SJN-2000"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                生产厂商
              </label>
              <input
                required
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="如 温州东富龙药机"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                启用日期
              </label>
              <input
                required
                type="date"
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                维保周期 (天)
              </label>
              <input
                required
                type="number"
                min={1}
                max={3650}
                value={maintenanceCycleDays}
                onChange={(e) => setMaintenanceCycleDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              初始生命周期阶段
            </label>
            <select
              value={lifecycleStage}
              onChange={(e) => setLifecycleStage(e.target.value as LifecycleStage)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
            >
              {LIFECYCLE_STAGES.slice(0, 3).map((st) => (
                <option key={st.key} value={st.key}>
                  {st.label} · {st.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              核心工艺参数（容积、功率、温控范围等）
            </label>
            <input
              type="text"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="如 容积 2000L · 316L不锈钢 · 夹套蒸汽 0.3MPa"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg cursor-pointer"
            >
              {submitting ? '写入台账中...' : '确认建档'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RepairCompletionModalProps {
  order: RepairOrder | null;
  spareParts: SparePart[];
  onClose: () => void;
  onSubmit: (
    order: RepairOrder,
    payload: {
      rootCause: string;
      resolution: string;
      downtimeMinutes: number;
      consumedParts: { part: SparePart; qty: number }[];
    }
  ) => Promise<void>;
}

export function RepairCompletionModal({
  order,
  spareParts,
  onClose,
  onSubmit,
}: RepairCompletionModalProps) {
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [downtimeMinutes, setDowntimeMinutes] = useState(45);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState(1);
  const [consumed, setConsumed] = useState<{ part: SparePart; qty: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!order) return;
    setRootCause(order.rootCause || '');
    setResolution(order.resolution || '');
    setDowntimeMinutes(order.downtimeMinutes || 45);
    setConsumed([]);
    setSelectedPartId('');
    setSelectedPartQty(1);
  }, [order]);

  if (!order) return null;

  const availableParts = spareParts.filter((p) => p.stockQty > 0);

  const addPartUsage = () => {
    const part = availableParts.find((p) => p.id === selectedPartId);
    if (!part || selectedPartQty <= 0) return;
    const cappedQty = Math.min(part.stockQty, Math.round(selectedPartQty));
    setConsumed((prev) => {
      const existing = prev.find((i) => i.part.id === part.id);
      if (existing) {
        return prev.map((i) =>
          i.part.id === part.id
            ? { part, qty: Math.min(part.stockQty, i.qty + cappedQty) }
            : i
        );
      }
      return [...prev, { part, qty: cappedQty }];
    });
    setSelectedPartId('');
    setSelectedPartQty(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootCause.trim() || !resolution.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(order, {
        rootCause,
        resolution,
        downtimeMinutes,
        consumedParts: consumed,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="font-mono text-xs text-slate-500">
              {order.orderNo} · {order.equipmentCode}
            </div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              填写维修结果与备件领用
            </h3>
          </div>
          <button
            type="button"
            aria-label="关闭完工弹窗"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              故障根本原因
            </label>
            <input
              required
              type="text"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="例如：硅胶密封圈长期受热老化开裂"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              现场处理措施与测试结果
            </label>
            <textarea
              required
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="例如：更换耐高温食品级硅胶密封圈，保压 0.25MPa 15分钟无渗漏"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              本次累计停机维修时长（分钟）
            </label>
            <input
              required
              type="number"
              min={0}
              max={100000}
              value={downtimeMinutes}
              onChange={(e) => setDowntimeMinutes(Number(e.target.value))}
              className="w-40 px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Spare Parts Consumption */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="text-xs font-semibold text-slate-700">
              领用易损备件（提交后自动扣减对应库存）
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="flex-1 min-w-[200px] px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
              >
                <option value="">选择领用备件（可选）...</option>
                {availableParts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partCode} · {p.name} (余 {p.stockQty} {p.unit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={99}
                value={selectedPartQty}
                onChange={(e) => setSelectedPartQty(Number(e.target.value))}
                className="w-16 px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md"
              />
              <button
                type="button"
                onClick={addPartUsage}
                disabled={!selectedPartId}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-md cursor-pointer"
              >
                添加领料
              </button>
            </div>

            {consumed.length > 0 && (
              <div className="space-y-1 pt-1">
                {consumed.map((item) => (
                  <div
                    key={item.part.id}
                    className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 border border-slate-200 rounded"
                  >
                    <span>
                      {item.part.name} ×{' '}
                      <strong className="font-mono">
                        {item.qty} {item.part.unit}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setConsumed((prev) =>
                          prev.filter((i) => i.part.id !== item.part.id)
                        )
                      }
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg cursor-pointer"
            >
              {submitting ? '保存并扣库中...' : '提交完工待验收'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
