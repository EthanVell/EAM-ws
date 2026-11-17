export type Workshop =
  | '前处理车间'
  | '提取浓缩车间'
  | '制剂车间'
  | '包装车间';

export type UserWorkshop = '全厂统筹' | Workshop;

export type UserRole = 'operator' | 'technician' | 'supervisor';

export type LifecycleStage =
  | 'commissioning'
  | 'active'
  | 'overhaul'
  | 'sealed'
  | 'scrapped';

export type HealthStatus = 'normal' | 'attention' | 'repairing' | 'stopped';

export type FaultCategory =
  | '机械传动'
  | '电气控制'
  | '密封渗漏'
  | '温压异常'
  | '清洁与筛网'
  | '其他故障';

export type RepairUrgency = 'normal' | 'high' | 'critical';

export type RepairStatus = 'pending' | 'in_progress' | 'verifying' | 'closed';

export type ShiftType = '早班' | '中班' | '夜班';

export type LifecycleEventType =
  | 'commissioned'
  | 'stage_change'
  | 'inspection'
  | 'repair_opened'
  | 'repair_closed'
  | 'maintenance';

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  workshop: UserWorkshop;
  factoryId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Equipment {
  id: string;
  factoryId: string;
  code: string;
  name: string;
  workshop: Workshop;
  processSection: string;
  model: string;
  manufacturer: string;
  specs: string;
  installDate: string;
  maintenanceCycleDays: number;
  lifecycleStage: LifecycleStage;
  healthStatus: HealthStatus;
  lastInspectedAt: string;
  nextMaintenanceDate: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RepairOrder {
  id: string;
  factoryId: string;
  orderNo: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  workshop: Workshop;
  reporterUid: string;
  reporterName: string;
  assigneeUid: string;
  assigneeName: string;
  faultCategory: FaultCategory;
  urgency: RepairUrgency;
  description: string;
  status: RepairStatus;
  rootCause: string;
  resolution: string;
  downtimeMinutes: number;
  partsSummary: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InspectionRecord {
  id: string;
  factoryId: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  workshop: Workshop;
  inspectorUid: string;
  inspectorName: string;
  shift: ShiftType;
  overallResult: 'pass' | 'abnormal';
  summaryNote: string;
  checkItemsSummary: string;
  linkedOrderNo: string;
  createdAt?: unknown;
}

export interface SparePart {
  id: string;
  factoryId: string;
  partCode: string;
  name: string;
  spec: string;
  applicableWorkshop: '通用备件' | Workshop;
  unit: string;
  stockQty: number;
  minThreshold: number;
  updatedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LifecycleLog {
  id: string;
  factoryId: string;
  equipmentId: string;
  equipmentCode: string;
  eventType: LifecycleEventType;
  title: string;
  detail: string;
  actorUid: string;
  actorName: string;
  createdAt?: unknown;
}

export const FACTORY_ID = 'bencao-main';
export const BOOTSTRAP_ADMIN_EMAIL = 'wylvyx@gmail.com';

export const WORKSHOPS: Workshop[] = [
  '前处理车间',
  '提取浓缩车间',
  '制剂车间',
  '包装车间',
];

export const FAULT_CATEGORIES: FaultCategory[] = [
  '机械传动',
  '电气控制',
  '密封渗漏',
  '温压异常',
  '清洁与筛网',
  '其他故障',
];

export const ROLE_META: Record<
  UserRole,
  { label: string; shortLabel: string; description: string }
> = {
  operator: {
    label: '车间操作员',
    shortLabel: '操作员',
    description: '执行日常班前点检、发起异常报修、维修完成后试机验收闭环',
  },
  technician: {
    label: '维修工程师',
    shortLabel: '维修工',
    description: '接收故障报修工单、排查根因与处理措施、领用易损备件并提交验收',
  },
  supervisor: {
    label: '设备主管',
    shortLabel: '主管',
    description: '设备建档与全生命周期流转、工单派工调度、备件补货及成员权限管理',
  },
};

export const LIFECYCLE_STAGES: {
  key: LifecycleStage;
  label: string;
  description: string;
}[] = [
  { key: 'commissioning', label: '安装验收', description: '到厂安装与试机确认' },
  { key: 'active', label: '在役运行', description: '正常投入 GMP 车间生产' },
  { key: 'overhaul', label: '大修维保', description: '停机进行大修或关键部件更换' },
  { key: 'sealed', label: '封存停用', description: '工艺调整或阶段性停产封存' },
  { key: 'scrapped', label: '报废注销', description: '达到寿命年限退出资产台账' },
];

export const HEALTH_STATUS_META: Record<
  HealthStatus,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  normal: {
    label: '正常运行',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  attention: {
    label: '待检/预警',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  repairing: {
    label: '维修处理中',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-100/70',
    borderClass: 'border-amber-300',
  },
  stopped: {
    label: '故障停机',
    textClass: 'text-red-700',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
  },
};

export const REPAIR_STATUS_META: Record<
  RepairStatus,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  pending: {
    label: '待接单',
    textClass: 'text-red-700',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
  },
  in_progress: {
    label: '维修中',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  verifying: {
    label: '待验收',
    textClass: 'text-sky-700',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
  },
  closed: {
    label: '已闭环',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
};

export const URGENCY_META: Record<
  RepairUrgency,
  { label: string; textClass: string }
> = {
  normal: { label: '常规处理', textClass: 'text-slate-600' },
  high: { label: '优先加急', textClass: 'text-amber-700' },
  critical: { label: '停机紧急', textClass: 'text-red-700' },
};

export const WORKSHOP_INSPECTION_TEMPLATES: Record<Workshop, string[]> = {
  前处理车间: [
    '电机减速机运转声音与温升正常（≤65℃）',
    '刀具/筛网固定牢固，无破损或异物残留',
    '水电汽管路接头密封良好，无滴漏现象',
    '急停按钮与安全防护罩联锁灵敏可靠',
    '设备内外清场合格，无前批药材残留',
  ],
  提取浓缩车间: [
    '夹套及罐内压力表、安全阀在校验有效期内且读数正常',
    '人孔、排渣门硅胶密封圈完好，无蒸汽或药液渗漏',
    '温度/真空度传感器显示与现场表计一致',
    '循环泵、搅拌轴机械密封冷却水畅通无渗水',
    'CIP 在线清洗喷淋球旋转通畅，阀门切换灵活',
  ],
  制剂车间: [
    '冲模/胶囊模具或流化床筛网无裂纹及药粉粘连',
    '主传动润滑油位在视镜 1/2-2/3 之间，无漏油',
    '进风压差、物料温度控制波动在工艺允许范围内',
    '捕集布袋/防尘罩完好，无跑粉漏粉现象',
    '剔废机构、计量调节螺杆及急停开关功能正常',
  ],
  包装车间: [
    '热封板/加热辊温控显示稳定，无局部过热偏移',
    '气动系统气源压力稳定（0.5-0.7MPa），无漏气声',
    'PVC/铝箔牵引伺服同步精准，无跑偏卡带',
    '批号打码清晰，剔废剔除机构动作准确',
    '光电检测传感器清洁无粉尘遮挡',
  ],
};

export function formatFirestoreTime(ts: unknown): string {
  if (!ts) return '刚刚';
  try {
    const d =
      typeof ts === 'object' &&
      ts !== null &&
      'toDate' in ts &&
      typeof (ts as { toDate: () => Date }).toDate === 'function'
        ? (ts as { toDate: () => Date }).toDate()
        : ts instanceof Date
          ? ts
          : new Date(String(ts));
    if (Number.isNaN(d.getTime())) return '—';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return '—';
  }
}

export function sanitizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
}

export function clampStr(raw: string, maxLen: number): string {
  return raw.trim().slice(0, maxLen);
}
