import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Equipment,
  FAULT_CATEGORIES,
  RepairOrder,
  WORKSHOPS,
  Workshop,
} from '../types/eam';

interface WorkshopAnalyticsCardProps {
  equipment: Equipment[];
  orders: RepairOrder[];
  onSelectWorkshop: (ws: Workshop) => void;
}

type ChartMetricMode = 'orders' | 'faultRate';

export function WorkshopAnalyticsCard({
  equipment,
  orders,
  onSelectWorkshop,
}: WorkshopAnalyticsCardProps) {
  const [mode, setMode] = useState<ChartMetricMode>('orders');
  const [hoveredWorkshop, setHoveredWorkshop] = useState<Workshop | null>(null);

  const workshopStats = useMemo(() => {
    return WORKSHOPS.map((ws) => {
      const wsEquip = equipment.filter(
        (e) => e.workshop === ws && e.lifecycleStage !== 'scrapped'
      );
      const abnormalEquip = wsEquip.filter((e) => e.healthStatus !== 'normal');
      const faultRate =
        wsEquip.length > 0
          ? Math.round((abnormalEquip.length / wsEquip.length) * 100)
          : 0;

      const wsOrders = orders.filter((o) => o.workshop === ws);
      const openCount = wsOrders.filter((o) => o.status !== 'closed').length;
      const closedCount = wsOrders.filter((o) => o.status === 'closed').length;
      const totalDowntime = wsOrders.reduce(
        (acc, o) => acc + (o.downtimeMinutes || 0),
        0
      );

      return {
        workshop: ws,
        shortName: ws.replace('车间', ''),
        equipCount: wsEquip.length,
        abnormalCount: abnormalEquip.length,
        faultRate,
        totalOrders: wsOrders.length,
        openCount,
        closedCount,
        totalDowntime,
      };
    });
  }, [equipment, orders]);

  const categoryBreakdown = useMemo(() => {
    const counts = FAULT_CATEGORIES.map((cat) => ({
      category: cat,
      count: orders.filter((o) => o.faultCategory === cat).length,
    })).filter((c) => c.count > 0);
    counts.sort((a, b) => b.count - a.count);
    const maxCount = Math.max(1, ...counts.map((c) => c.count));
    return { counts, maxCount };
  }, [orders]);

  const maxOrderTotal = Math.max(
    4,
    ...workshopStats.map((s) => s.totalOrders)
  );
  const orderTicks = [
    0,
    Math.ceil(maxOrderTotal / 2),
    maxOrderTotal,
  ];

  const activeStat =
    workshopStats.find((s) => s.workshop === hoveredWorkshop) ||
    workshopStats[1] ||
    workshopStats[0];

  // SVG dimensions for responsive bar chart
  const chartHeight = 196;
  const barAreaTop = 18;
  const barAreaBottom = 160;
  const barMaxHeight = barAreaBottom - barAreaTop;

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-700 shrink-0" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              各车间设备稳定性与报修分布分析
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              悬停查看各工段详细故障与停机耗时，点击柱体跳转对应车间台账
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setMode('orders')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'orders'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            维修工单分布
          </button>
          <button
            type="button"
            onClick={() => setMode('faultRate')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'faultRate'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            设备异常故障率
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left 8 cols: Interactive SVG Bar Chart */}
        <div className="lg:col-span-8 p-5 space-y-4">
          {/* Legend + Active Readout */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-slate-600">
              {mode === 'orders' ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                    <span>在途工单（待修/待验）</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                    <span>已闭环工单</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                    <span>异常率 ≤ 20%（平稳）</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                    <span>20%–40%（关注）</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" />
                    <span>&gt; 40%（高风险）</span>
                  </span>
                </>
              )}
            </div>

            {activeStat && (
              <div className="text-xs text-slate-600 font-mono tabular-nums">
                {activeStat.workshop} · 停机 {activeStat.totalDowntime} 分钟 · 异常{' '}
                {activeStat.abnormalCount}/{activeStat.equipCount} 台
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 640 ${chartHeight}`}
              className="w-full min-w-[460px] h-52 select-none"
              role="img"
              aria-label="各车间设备故障率与维修工单分布图"
            >
              {/* Horizontal Gridlines & Y Axis */}
              {(mode === 'orders' ? orderTicks : [0, 50, 100]).map((tick) => {
                const maxVal = mode === 'orders' ? maxOrderTotal : 100;
                const y = barAreaBottom - (tick / maxVal) * barMaxHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={46}
                      x2={620}
                      y1={y}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray={tick === 0 ? undefined : '3 3'}
                      strokeWidth={1}
                    />
                    <text
                      x={38}
                      y={y + 4}
                      textAnchor="end"
                      fill="#64748B"
                      fontSize="11"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {mode === 'orders' ? tick : `${tick}%`}
                    </text>
                  </g>
                );
              })}

              {/* Bars per Workshop */}
              {workshopStats.map((stat, idx) => {
                const slotWidth = (620 - 60) / workshopStats.length;
                const centerX = 60 + slotWidth * idx + slotWidth / 2;
                const barWidth = 48;
                const x = centerX - barWidth / 2;
                const isHovered = hoveredWorkshop === stat.workshop;

                if (mode === 'orders') {
                  const openH =
                    (stat.openCount / maxOrderTotal) * barMaxHeight;
                  const closedH =
                    (stat.closedCount / maxOrderTotal) * barMaxHeight;
                  const totalH = openH + closedH;
                  const topY = barAreaBottom - totalH;

                  return (
                    <g
                      key={stat.workshop}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredWorkshop(stat.workshop)}
                      onMouseLeave={() => setHoveredWorkshop(null)}
                      onClick={() => onSelectWorkshop(stat.workshop)}
                    >
                      {isHovered && (
                        <rect
                          x={x - 12}
                          y={barAreaTop - 6}
                          width={barWidth + 24}
                          height={barMaxHeight + 34}
                          rx={6}
                          fill="#F8FAFC"
                        />
                      )}
                      {/* Closed segment (bottom) */}
                      {closedH > 0 && (
                        <rect
                          x={x}
                          y={barAreaBottom - closedH}
                          width={barWidth}
                          height={closedH}
                          rx={openH === 0 ? 4 : 0}
                          fill="#059669"
                        />
                      )}
                      {/* Open segment (top) */}
                      {openH > 0 && (
                        <rect
                          x={x}
                          y={topY}
                          width={barWidth}
                          height={openH}
                          rx={4}
                          fill="#D97706"
                        />
                      )}
                      {/* Top value label */}
                      <text
                        x={centerX}
                        y={Math.max(12, topY - 6)}
                        textAnchor="middle"
                        fill="#0F172A"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {stat.totalOrders} 单
                      </text>
                      {/* X axis label */}
                      <text
                        x={centerX}
                        y={barAreaBottom + 18}
                        textAnchor="middle"
                        fill={isHovered ? '#047857' : '#334155'}
                        fontSize="12"
                        fontWeight={isHovered ? '600' : '500'}
                      >
                        {stat.shortName}
                      </text>
                    </g>
                  );
                }

                // Fault Rate % Bar
                const barH = Math.max(
                  stat.faultRate > 0 ? 4 : 0,
                  (stat.faultRate / 100) * barMaxHeight
                );
                const topY = barAreaBottom - barH;
                const barColor =
                  stat.faultRate > 40
                    ? '#DC2626'
                    : stat.faultRate > 20
                      ? '#D97706'
                      : '#059669';

                return (
                  <g
                    key={stat.workshop}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredWorkshop(stat.workshop)}
                    onMouseLeave={() => setHoveredWorkshop(null)}
                    onClick={() => onSelectWorkshop(stat.workshop)}
                  >
                    {isHovered && (
                      <rect
                        x={x - 12}
                        y={barAreaTop - 6}
                        width={barWidth + 24}
                        height={barMaxHeight + 34}
                        rx={6}
                        fill="#F8FAFC"
                      />
                    )}
                    <rect
                      x={x}
                      y={topY}
                      width={barWidth}
                      height={barH}
                      rx={4}
                      fill={barColor}
                    />
                    <text
                      x={centerX}
                      y={Math.max(12, topY - 6)}
                      textAnchor="middle"
                      fill="#0F172A"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {stat.faultRate}%
                    </text>
                    <text
                      x={centerX}
                      y={barAreaBottom + 18}
                      textAnchor="middle"
                      fill={isHovered ? '#047857' : '#334155'}
                      fontSize="12"
                      fontWeight={isHovered ? '600' : '500'}
                    >
                      {stat.shortName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right 4 cols: Fault Category Breakdown */}
        <div className="lg:col-span-4 p-5 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-700 mb-3">
              累计故障类型分布 ({orders.length} 单)
            </h3>
            {categoryBreakdown.counts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                暂无故障工单记录
              </p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.counts.map((item) => {
                  const widthPct = Math.round(
                    (item.count / categoryBreakdown.maxCount) * 100
                  );
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700">{item.category}</span>
                        <span className="font-mono tabular-nums text-slate-900 font-medium">
                          {item.count} 单
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>全厂累计维修停机</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {orders.reduce((acc, o) => acc + (o.downtimeMinutes || 0), 0)} 分钟
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
