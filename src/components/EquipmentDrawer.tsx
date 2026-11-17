import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  CalendarClock,
  Check,
  ClipboardCheck,
  Copy,
  Download,
  History,
  QrCode,
  Wrench,
  X,
} from 'lucide-react';
import {
  Equipment,
  formatFirestoreTime,
  HEALTH_STATUS_META,
  LIFECYCLE_STAGES,
  LifecycleLog,
  LifecycleStage,
  RepairOrder,
} from '../types/eam';
import { HealthStatusIndicator, LifecycleStageText } from './StatusPrimitives';

interface EquipmentDrawerProps {
  equipment: Equipment | null;
  logs: LifecycleLog[];
  orders: RepairOrder[];
  isSupervisor: boolean;
  onClose: () => void;
  onInspect: (eq: Equipment) => void;
  onReportFault: (eq: Equipment) => void;
  onChangeStage: (eq: Equipment, nextStage: LifecycleStage, note: string) => Promise<void>;
  onNotify?: (msg: string) => void;
}

function getMaintenanceCountdown(nextDateStr: string): {
  label: string;
  toneClass: string;
} {
  if (!nextDateStr) {
    return { label: '未设定维护日期', toneClass: 'text-slate-600' };
  }
  const target = new Date(`${nextDateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return { label: '周期日期待核实', toneClass: 'text-slate-600' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return {
      label: `已逾期 ${Math.abs(diffDays)} 天`,
      toneClass: 'text-red-700',
    };
  }
  if (diffDays === 0) {
    return { label: '今日到期需保养', toneClass: 'text-amber-700' };
  }
  if (diffDays <= 7) {
    return { label: `即将到期 · 剩余 ${diffDays} 天`, toneClass: 'text-amber-700' };
  }
  return { label: `距离下次还有 ${diffDays} 天`, toneClass: 'text-emerald-700' };
}

export function EquipmentDrawer({
  equipment,
  logs,
  orders,
  isSupervisor,
  onClose,
  onInspect,
  onReportFault,
  onChangeStage,
  onNotify,
}: EquipmentDrawerProps) {
  const [selectedStage, setSelectedStage] = useState<LifecycleStage | null>(null);
  const [stageNote, setStageNote] = useState('');
  const [savingStage, setSavingStage] = useState(false);

  const [showCard, setShowCard] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const equipmentUrl = equipment
    ? `${window.location.origin}/?equip=${encodeURIComponent(equipment.id)}`
    : '';

  useEffect(() => {
    setShowCard(false);
    setQrDataUrl('');
    setCopiedLink(false);
    setSelectedStage(null);
    setStageNote('');
  }, [equipment?.id]);

  useEffect(() => {
    if (!showCard || !equipmentUrl) return;
    let active = true;
    QRCode.toDataURL(equipmentUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR generation failed:', err);
      });
    return () => {
      active = false;
    };
  }, [showCard, equipmentUrl]);

  if (!equipment) return null;

  const eqLogs = logs
    .filter((l) => l.equipmentId === equipment.id)
    .sort((a, b) => {
      const ta = formatFirestoreTime(a.createdAt);
      const tb = formatFirestoreTime(b.createdAt);
      return tb.localeCompare(ta);
    });

  const eqOrders = orders.filter((o) => o.equipmentId === equipment.id);
  const totalDowntime = eqOrders.reduce((acc, o) => acc + (o.downtimeMinutes || 0), 0);
  const pmCountdown = getMaintenanceCountdown(equipment.nextMaintenanceDate);

  const handleStageSubmit = async () => {
    if (!selectedStage || selectedStage === equipment.lifecycleStage) return;
    setSavingStage(true);
    try {
      await onChangeStage(equipment, selectedStage, stageNote);
      setSelectedStage(null);
      setStageNote('');
    } finally {
      setSavingStage(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(equipmentUrl);
      setCopiedLink(true);
      onNotify?.(`已复制 ${equipment.code} 扫码查阅链接`);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      onNotify?.('复制失败，请手动复制地址栏链接');
    }
  };

  const handleDownloadCardPng = async () => {
    if (!qrDataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background & outer border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    // Header band
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(18, 18, canvas.width - 36, 78);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 96);
    ctx.lineTo(canvas.width - 18, 96);
    ctx.stroke();

    ctx.fillStyle = '#047857';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('EAM 设备报修 · 设备电子保养卡', 44, 64);

    ctx.fillStyle = '#64748B';
    ctx.font = '18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${equipment.workshop} · ${equipment.processSection}`, canvas.width - 44, 64);
    ctx.textAlign = 'left';

    // Left details
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 42px monospace';
    ctx.fillText(equipment.code, 44, 162);

    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(equipment.name, 44, 212);

    ctx.fillStyle = '#475569';
    ctx.font = '20px sans-serif';
    ctx.fillText(`型号规格：${equipment.model} · ${equipment.manufacturer}`, 44, 260);
    ctx.fillText(`当前状态：${HEALTH_STATUS_META[equipment.healthStatus].label}`, 44, 298);
    ctx.fillText(
      `最近点检：${equipment.lastInspectedAt || '尚未点检'}`,
      44,
      336
    );

    // Highlighted PM Date Box
    ctx.fillStyle = '#ECFDF5';
    ctx.fillRect(44, 372, 540, 108);
    ctx.strokeStyle = '#A7F3D0';
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 372, 540, 108);

    ctx.fillStyle = '#065F46';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('下一次预防性维护日期', 66, 408);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(equipment.nextMaintenanceDate || '待排期', 66, 456);

    ctx.fillStyle = '#047857';
    ctx.font = '18px sans-serif';
    ctx.fillText(`周期：每 ${equipment.maintenanceCycleDays} 天`, 320, 454);

    // Right QR box
    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.strokeRect(634, 140, 276, 276);
      ctx.drawImage(qrImg, 650, 156, 244, 244);

      ctx.fillStyle = '#475569';
      ctx.font = '17px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('现场扫码查阅台账与报修', 772, 452);

      const link = document.createElement('a');
      link.download = `${equipment.code}_电子保养卡.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      onNotify?.(`已导出 ${equipment.code} 电子保养卡图片`);
    };
    qrImg.src = qrDataUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/35 transition-opacity"
        onClick={onClose}
      />
      <aside className="relative z-10 w-full max-w-xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span>{equipment.code}</span>
              <span aria-hidden="true">·</span>
              <span>{equipment.workshop}</span>
              <span aria-hidden="true">·</span>
              <span>{equipment.processSection}</span>
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-900 mt-1 truncate">
              {equipment.name}
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭抽屉"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status + Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[11px] text-slate-500 mb-1">当前健康状态</div>
                <HealthStatusIndicator status={equipment.healthStatus} />
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div>
                <div className="text-[11px] text-slate-500 mb-1">生命周期阶段</div>
                <LifecycleStageText stage={equipment.lifecycleStage} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCard((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  showCard
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 hover:border-emerald-500 hover:text-emerald-800 text-slate-700'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showCard ? '收起电子保养卡' : '生成电子保养卡'}</span>
              </button>

              {equipment.lifecycleStage !== 'scrapped' && (
                <>
                  <button
                    type="button"
                    onClick={() => onInspect(equipment)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>立即点检</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onReportFault(equipment)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-amber-400 hover:text-amber-800 text-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>故障报修</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Electronic Maintenance Card Panel */}
          {showCard && (
            <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs font-semibold text-emerald-700">
                    EAM 设备报修 · 现场扫码电子保养卡
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    张贴于设备工位旁，扫码可直达本设备台账、点检与报修入口
                  </div>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-800">
                  {equipment.code}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4">
                {/* Real Scannable QR Code */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center shrink-0">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`${equipment.code} 设备电子保养卡二维码`}
                      className="w-32 h-32 block"
                    />
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center text-xs text-slate-400">
                      生成二维码中...
                    </div>
                  )}
                  <span className="mt-1.5 text-[11px] text-slate-500">
                    扫码直达设备档案
                  </span>
                </div>

                {/* Next PM Date & Equipment Key Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-3 w-full">
                  <div className="bg-white border border-slate-200 rounded-lg p-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <CalendarClock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>下一次预防性维护日期</span>
                    </div>
                    <div className="font-mono tabular-nums text-xl font-semibold text-slate-900">
                      {equipment.nextMaintenanceDate || '待排期'}
                    </div>
                    <div className={`text-xs font-medium mt-1 ${pmCountdown.toneClass}`}>
                      {pmCountdown.label}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">保养周期</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        每 {equipment.maintenanceCycleDays} 天
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">最近点检</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {equipment.lastInspectedAt || '尚未点检'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">设备型号</span>
                      <span className="font-mono text-slate-900 truncate">
                        {equipment.model}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? '已复制链接' : '复制设备链接'}</span>
                </button>
                <button
                  type="button"
                  disabled={!qrDataUrl}
                  onClick={handleDownloadCardPng}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出保养卡 PNG</span>
                </button>
              </div>
            </section>
          )}

          {/* 5-Stage Lifecycle Stepper */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-700">
                设备全生命周期阶段追踪
              </h3>
              {isSupervisor && (
                <span className="text-[11px] text-slate-500">
                  主管可点击目标阶段执行状态流转
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {LIFECYCLE_STAGES.map((st, idx) => {
                const currentIdx = LIFECYCLE_STAGES.findIndex(
                  (x) => x.key === equipment.lifecycleStage
                );
                const isCurrent = st.key === equipment.lifecycleStage;
                const isPast = idx < currentIdx;
                const isPendingTarget = selectedStage === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    disabled={!isSupervisor || isCurrent}
                    onClick={() => setSelectedStage(isPendingTarget ? null : st.key)}
                    className={`p-2 rounded-lg border text-left transition-colors ${
                      isCurrent
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : isPendingTarget
                          ? 'bg-amber-50 border-amber-500 text-amber-900'
                          : isPast
                            ? 'bg-slate-50 border-slate-200 text-slate-700'
                            : 'bg-white border-slate-200 text-slate-500'
                    } ${
                      isSupervisor && !isCurrent
                        ? 'hover:border-emerald-400 cursor-pointer'
                        : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span>0{idx + 1}</span>
                      {(isCurrent || isPast) && <Check className="w-3 h-3 text-emerald-600" />}
                    </div>
                    <div className="text-xs font-medium truncate">{st.label}</div>
                  </button>
                );
              })}
            </div>

            {isSupervisor && selectedStage && selectedStage !== equipment.lifecycleStage && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <div className="text-xs font-medium text-slate-800">
                  确认将生命周期阶段变更为：
                  <span className="text-emerald-700 ml-1">
                    {LIFECYCLE_STAGES.find((s) => s.key === selectedStage)?.label}
                  </span>
                </div>
                <input
                  type="text"
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="填写变更说明（如：完成大修试机验收、年度封存等）"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStage(null);
                      setStageNote('');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleStageSubmit}
                    disabled={savingStage}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-md cursor-pointer disabled:opacity-60"
                  >
                    {savingStage ? '提交中...' : '确认变更并写入履历'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Equipment Specs Table */}
          <section>
            <h3 className="text-xs font-semibold text-slate-700 mb-3">设备铭牌与维护参数</h3>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              <div className="grid grid-cols-3 px-3.5 py-2.5">
                <span className="text-slate-500">设备型号 / 厂商</span>
                <span className="col-span-2 text-slate-900 font-medium">
                  <span className="font-mono mr-2">{equipment.model}</span>
                  {equipment.manufacturer}
                </span>
              </div>
              <div className="grid grid-cols-3 px-3.5 py-2.5">
                <span className="text-slate-500">核心工艺参数</span>
                <span className="col-span-2 text-slate-800">{equipment.specs || '—'}</span>
              </div>
              <div className="grid grid-cols-3 px-3.5 py-2.5">
                <span className="text-slate-500">启用 / 下次保养</span>
                <span className="col-span-2 font-mono tabular-nums text-slate-800">
                  启用 {equipment.installDate} · 保养周期 {equipment.maintenanceCycleDays} 天 · 下次{' '}
                  {equipment.nextMaintenanceDate}
                </span>
              </div>
              <div className="grid grid-cols-3 px-3.5 py-2.5">
                <span className="text-slate-500">累计报修 / 停机</span>
                <span className="col-span-2 font-mono tabular-nums text-slate-800">
                  {eqOrders.length} 次工单 · 累计停机 {totalDowntime} 分钟
                </span>
              </div>
            </div>
          </section>

          {/* Lifecycle Timeline */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-700">
                全生命周期履历时间线 ({eqLogs.length})
              </h3>
            </div>
            {eqLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 border border-dashed border-slate-200 rounded-lg text-center">
                暂无履历记录，执行点检或报修后将自动沉淀至此。
              </p>
            ) : (
              <div className="space-y-3 border-l border-slate-200 ml-2 pl-4">
                {eqLogs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="text-xs font-semibold text-slate-900">{log.title}</div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{log.detail}</p>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
                      {log.actorName} · {formatFirestoreTime(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
