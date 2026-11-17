import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Package,
  Wrench,
} from 'lucide-react';
import {
  Equipment,
  formatFirestoreTime,
  InspectionRecord,
  RepairOrder,
  SparePart,
  WORKSHOPS,
  Workshop,
} from '../types/eam';
import { RepairStatusTag, UrgencyLabel } from './StatusPrimitives';
import { NavSection } from './AppShell';
import { WorkshopAnalyticsCard } from './WorkshopAnalyticsCard';
import { PotentialFaultWarningPanel } from './PotentialFaultWarningPanel';

interface DashboardViewProps {
  equipment: Equipment[];
  orders: RepairOrder[];
  inspections: InspectionRecord[];
  spareParts: SparePart[];
  isSupervisor: boolean;
  seeding: boolean;
  onSeedData: () => void;
  onNavigate: (section: NavSection, workshopFilter?: Workshop) => void;
  onSelectEquipment: (eq: Equipment) => void;
  onInspectEquipment: (eq: Equipment) => void;
}

export function DashboardView({
  equipment,
  orders,
  inspections,
  spareParts,
  isSupervisor,
  seeding,
  onSeedData,
  onNavigate,
  onSelectEquipment,
  onInspectEquipment,
}: DashboardViewProps) {
  const activeEquipment = equipment.filter((e) => e.lifecycleStage !== 'scrapped');
  const normalCount = activeEquipment.filter((e) => e.healthStatus === 'normal').length;
  const openOrders = orders.filter((o) => o.status !== 'closed');
  const criticalOrders = openOrders.filter((o) => o.urgency === 'critical').length;
  const lowStockParts = spareParts.filter((p) => p.stockQty <= p.minThreshold);
  const recentPassRate =
    inspections.length > 0
      ? Math.round(
          (inspections.filter((i) => i.overallResult === 'pass').length /
            inspections.length) *
            100
        )
      : 100;

  if (equipment.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 max-w-2xl mx-auto mt-8 text-center">
        <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
          <Database className="w-6 h-6 text-emerald-700" />
        </div>
        <h2 className="font-display text-xl font-semibold text-slate-900 mb-2">
          工厂设备台账尚未初始化
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          当前云端工作区暂无设备资产记录。您可以一键灌入涵盖「前处理、提取浓缩、制剂、包装」四大中药车间的 12 台典型生产设备、配套易损备件及演示工单，也可以前往设备台账手动建档。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isSupervisor ? (
            <button
              type="button"
              onClick={onSeedData}
              disabled={seeding}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {seeding ? '正在写入云端台账...' : '初始化中药全流程示范车间数据'}
            </button>
          ) : (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              请联系设备主管初始化全厂设备档案
            </span>
          )}
          <button
            type="button"
            onClick={() => onNavigate('equipment')}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            前往设备台账
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top 4 KPI strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">在册有效设备</div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-3xl font-semibold text-slate-900">
              {activeEquipment.length}
            </span>
            <span className="text-xs text-emerald-700 font-medium tabular-nums">
              {normalCount} 台正常运行
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            覆盖四车间生产及辅助设备
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">待闭环故障工单</div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-3xl font-semibold text-slate-900">
              {openOrders.length}
            </span>
            <span
              className={`text-xs font-medium tabular-nums ${
                criticalOrders > 0 ? 'text-red-700' : 'text-slate-600'
              }`}
            >
              {criticalOrders > 0 ? `${criticalOrders} 单停机紧急` : '无停机紧急单'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            含待接单、维修中与待验收
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">近期点检合格率</div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-3xl font-semibold text-slate-900">
              {recentPassRate}%
            </span>
            <span className="text-xs text-slate-600 tabular-nums">
              共 {inspections.length} 条记录
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            异常项支持直通生成报修单
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">低库存预警备件</div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-3xl font-semibold text-slate-900">
              {lowStockParts.length}
            </span>
            <span
              className={`text-xs font-medium tabular-nums ${
                lowStockParts.length > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {lowStockParts.length > 0 ? '需及时采购补货' : '库存处于安全线以上'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            维修结单领料自动扣减库存
          </div>
        </div>
      </section>

      {/* Four Workshops Overview */}
      <section className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              全流程中药车间运行分布
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              点击任意车间可直达对应车间设备台账
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('equipment')}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap"
          >
            <span>查看全部台账</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          {WORKSHOPS.map((ws) => {
            const wsEquip = activeEquipment.filter((e) => e.workshop === ws);
            const wsNormal = wsEquip.filter((e) => e.healthStatus === 'normal').length;
            const wsAbnormal = wsEquip.length - wsNormal;
            const wsOrders = openOrders.filter((o) => o.workshop === ws).length;
            return (
              <button
                key={ws}
                type="button"
                onClick={() => onNavigate('equipment', ws)}
                className="p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-sm font-semibold text-slate-900">{ws}</span>
                  <span className="font-mono tabular-nums text-xs text-slate-500">
                    {wsEquip.length} 台
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="tabular-nums">正常 {wsNormal}</span>
                  </span>
                  {wsAbnormal > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="tabular-nums">异常/维保 {wsAbnormal}</span>
                    </span>
                  )}
                </div>
                <div className="mt-3 text-xs text-slate-500 tabular-nums">
                  在途工单 {wsOrders} 项
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Workshop Fault Rate & Work Order Visualization */}
      <WorkshopAnalyticsCard
        equipment={equipment}
        orders={orders}
        onSelectWorkshop={(ws) => onNavigate('equipment', ws)}
      />

      {/* MTBF Predictive Fault Warning Panel */}
      <PotentialFaultWarningPanel
        equipment={equipment}
        orders={orders}
        onSelectEquipment={onSelectEquipment}
        onInspectEquipment={onInspectEquipment}
      />

      {/* Split Workspace: Active Repair Queue + Low Stock & Inspections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Priority Active Repair Queue */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-500" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                待闭环故障报修队列
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('repairs')}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap"
            >
              <span>处理工单</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {openOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              当前全厂无待处理故障工单，所有设备运行平稳。
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {openOrders.slice(0, 6).map((order) => {
                const eq = equipment.find((e) => e.id === order.equipmentId);
                return (
                  <div
                    key={order.id}
                    className="px-5 py-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono tabular-nums text-xs font-medium text-slate-500">
                          {order.orderNo}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={() => eq && onSelectEquipment(eq)}
                          className="text-sm font-semibold text-slate-900 hover:text-emerald-700 cursor-pointer truncate"
                        >
                          {order.equipmentCode} {order.equipmentName}
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {order.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{order.workshop}</span>
                        <span aria-hidden="true">·</span>
                        <span>{order.faultCategory}</span>
                        <span aria-hidden="true">·</span>
                        <UrgencyLabel urgency={order.urgency} />
                        <span aria-hidden="true">·</span>
                        <span>接单：{order.assigneeName || '待派单'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <RepairStatusTag status={order.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right 5 cols: Low Stock Spare Parts + Recent Inspections */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                <h2 className="font-display text-base font-semibold text-slate-900">
                  备件库存预警
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('parts')}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap"
              >
                <span>备件库</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {lowStockParts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                所有易损备件库存充足，均高于安全阈值。
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStockParts.map((part) => (
                  <div
                    key={part.id}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {part.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        <span className="font-mono">{part.partCode}</span> ·{' '}
                        {part.applicableWorkshop}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono tabular-nums text-sm font-semibold text-red-700">
                        {part.stockQty} {part.unit}
                      </div>
                      <div className="font-mono tabular-nums text-[11px] text-slate-500">
                        安全线 {part.minThreshold}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-slate-500" />
                <h2 className="font-display text-base font-semibold text-slate-900">
                  最新点检动态
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('inspections')}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap"
              >
                <span>去点检</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {inspections.slice(0, 4).map((ins) => (
                <div key={ins.id} className="px-5 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      <span className="font-mono text-slate-500 mr-1.5">
                        {ins.equipmentCode}
                      </span>
                      {ins.equipmentName}
                    </span>
                    <span
                      className={`text-xs font-medium whitespace-nowrap ${
                        ins.overallResult === 'pass'
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                    >
                      {ins.overallResult === 'pass' ? '合格' : '异常'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {ins.shift} · {ins.inspectorName} · {formatFirestoreTime(ins.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
