import {
  FaultCategory,
  HealthStatus,
  LifecycleEventType,
  LifecycleStage,
  RepairStatus,
  RepairUrgency,
  ShiftType,
  Workshop,
} from '../types/eam';

export interface SeedEquipmentInput {
  id: string;
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
}

export const SEED_EQUIPMENT: SeedEquipmentInput[] = [
  {
    id: 'eq-qcl-01',
    code: 'QCL-01',
    name: '滚筒式中药洗药机',
    workshop: '前处理车间',
    processSection: '净制洗润工段',
    model: 'XYG-1200',
    manufacturer: '浙江江南制药机械',
    specs: '处理量 800kg/h · 高压喷淋 0.4MPa · 304不锈钢',
    installDate: '2023-04-12',
    maintenanceCycleDays: 30,
    lifecycleStage: 'active',
    healthStatus: 'normal',
    lastInspectedAt: '2026-11-15 08:15',
    nextMaintenanceDate: '2026-12-01',
  },
  {
    id: 'eq-qcl-02',
    code: 'QCL-02',
    name: '往复式中药切药机',
    workshop: '前处理车间',
    processSection: '切制工段',
    model: 'QYJ-400B',
    manufacturer: '上海天祥制药机械',
    specs: '切片厚度 0.5-15mm · 变频调速 4kW',
    installDate: '2023-05-18',
    maintenanceCycleDays: 15,
    lifecycleStage: 'active',
    healthStatus: 'attention',
    lastInspectedAt: '2026-11-14 14:20',
    nextMaintenanceDate: '2026-11-20',
  },
  {
    id: 'eq-qcl-03',
    code: 'QCL-03',
    name: 'GMP 热风循环烘箱',
    workshop: '前处理车间',
    processSection: '干燥工段',
    model: 'CT-C-II',
    manufacturer: '常州先锋干燥设备',
    specs: '控温 40-140℃ · 48盘双门 · 蒸汽/电双热源',
    installDate: '2022-09-10',
    maintenanceCycleDays: 30,
    lifecycleStage: 'active',
    healthStatus: 'normal',
    lastInspectedAt: '2026-11-15 08:30',
    nextMaintenanceDate: '2026-11-28',
  },
  {
    id: 'eq-qcl-04',
    code: 'QCL-04',
    name: '水冷式超微粉碎机',
    workshop: '前处理车间',
    processSection: '粉碎过筛工段',
    model: 'WFJ-30',
    manufacturer: '江阴宏达粉体机械',
    specs: '细度 80-320目 · 功率 22kW · 夹套水冷',
    installDate: '2021-11-05',
    maintenanceCycleDays: 30,
    lifecycleStage: 'overhaul',
    healthStatus: 'repairing',
    lastInspectedAt: '2026-11-14 09:00',
    nextMaintenanceDate: '2026-11-18',
  },
  {
    id: 'eq-tq-101',
    code: 'TQ-101',
    name: '多功能中药提取罐',
    workshop: '提取浓缩车间',
    processSection: '水提/醇提工段',
    model: 'TQ-3000L',
    manufacturer: '温州东富龙药机',
    specs: '容积 3000L · 夹套设计压力 0.35MPa · 316L',
    installDate: '2022-03-20',
    maintenanceCycleDays: 30,
    lifecycleStage: 'active',
    healthStatus: 'stopped',
    lastInspectedAt: '2026-11-15 07:45',
    nextMaintenanceDate: '2026-11-22',
  },
  {
    id: 'eq-tq-102',
    code: 'TQ-102',
    name: '双效节能真空浓缩器',
    workshop: '提取浓缩车间',
    processSection: '减压浓缩工段',
    model: 'SJN-1500',
    manufacturer: '温州科迪制药机械',
    specs: '蒸发量 1500kg/h · 真空度 -0.085MPa',
    installDate: '2022-04-02',
    maintenanceCycleDays: 30,
    lifecycleStage: 'active',
    healthStatus: 'normal',
    lastInspectedAt: '2026-11-15 08:10',
    nextMaintenanceDate: '2026-12-05',
  },
  {
    id: 'eq-tq-103',
    code: 'TQ-103',
    name: '低温夹套醇沉罐',
    workshop: '提取浓缩车间',
    processSection: '醇沉静置工段',
    model: 'CC-2000L',
    manufacturer: '温州东富龙药机',
    specs: '容积 2000L · 冷媒控温 0-8℃ · 防爆搅拌',
    installDate: '2023-01-15',
    maintenanceCycleDays: 45,
    lifecycleStage: 'active',
    healthStatus: 'normal',
    lastInspectedAt: '2026-11-15 08:25',
    nextMaintenanceDate: '2026-12-10',
  },
  {
    id: 'eq-tq-104',
    code: 'TQ-104',
    name: '高速管式分离离心机',
    workshop: '提取浓缩车间',
    processSection: '澄清除杂工段',
    model: 'GQ-105',
    manufacturer: '辽阳富邦离心机',
    specs: '转速 16000r/min · 分离因数 15900G',
    installDate: '2020-08-24',
    maintenanceCycleDays: 15,
    lifecycleStage: 'sealed',
    healthStatus: 'attention',
    lastInspectedAt: '2026-11-10 16:00',
    nextMaintenanceDate: '2026-12-15',
  },
  {
    id: 'eq-zj-201',
    code: 'ZJ-201',
    name: '一步沸腾制粒干燥机',
    workshop: '制剂车间',
    processSection: '制粒干燥工段',
    model: 'FL-200',
    manufacturer: '重庆精工制药机械',
    specs: '批产量 200kg · 进风温度 50-110℃ · 2bar防爆',
    installDate: '2023-07-08',
    maintenanceCycleDays: 30,
    lifecycleStage: 'active',
    healthStatus: 'normal',
    lastInspectedAt: '2026-11-15 08:40',
    nextMaintenanceDate: '2026-12-03',
  },
  {
    id: 'eq-zj-202',
    code: 'ZJ-202',
    name: '高速旋转压片机',
    workshop: '制剂车间',
    processSection: '压片成型工段',
    model: 'GZPK-3200',
    manufacturer: '北京翰林航宇',
    specs: '35冲 · 最高产量 21万片/h · 主压力 100kN',
    installDate: '2023-08-19',
    maintenanceCycleDays: 15,
    lifecycleStage: 'active',
    healthStatus: 'normal',
    lastInspectedAt: '2026-11-15 08:50',
    nextMaintenanceDate: '2026-11-26',
  },
  {
    id: 'eq-zj-203',
    code: 'ZJ-203',
    name: '全自动硬胶囊填充机',
    workshop: '制剂车间',
    processSection: '胶囊充填工段',
    model: 'NJP-1200C',
    manufacturer: '浙江富昌机械',
    specs: '产量 72000粒/h · 0#-4#模具切换',
    installDate: '2024-02-11',
    maintenanceCycleDays: 30,
    lifecycleStage: 'active',
    healthStatus: 'normal',
    lastInspectedAt: '2026-11-14 21:10',
    nextMaintenanceDate: '2026-12-08',
  },
  {
    id: 'eq-bz-301',
    code: 'BZ-301',
    name: '平板式铝塑泡罩包装机',
    workshop: '包装车间',
    processSection: '内包泡罩工段',
    model: 'DPP-260K',
    manufacturer: '瑞安华联药机',
    specs: '冲裁频率 20-60次/min · 在线视觉剔废',
    installDate: '2023-10-14',
    maintenanceCycleDays: 20,
    lifecycleStage: 'active',
    healthStatus: 'normal',
    lastInspectedAt: '2026-11-15 09:05',
    nextMaintenanceDate: '2026-11-29',
  },
];

export interface SeedPartInput {
  id: string;
  partCode: string;
  name: string;
  spec: string;
  applicableWorkshop: '通用备件' | Workshop;
  unit: string;
  stockQty: number;
  minThreshold: number;
}

export const SEED_SPARE_PARTS: SeedPartInput[] = [
  {
    id: 'part-mf01',
    partCode: 'BJ-MF01',
    name: '反应提取罐双端面机械密封',
    spec: 'DN65 · 碳化硅/氟橡胶耐醇耐温',
    applicableWorkshop: '提取浓缩车间',
    unit: '套',
    stockQty: 2,
    minThreshold: 3,
  },
  {
    id: 'part-gq02',
    partCode: 'BJ-GQ02',
    name: '快开人孔耐高温硅胶密封圈',
    spec: 'DN450 · 食品级白金硫化硅胶',
    applicableWorkshop: '提取浓缩车间',
    unit: '条',
    stockQty: 8,
    minThreshold: 4,
  },
  {
    id: 'part-lw03',
    partCode: 'BJ-LW03',
    name: '提取罐出液口不锈钢烧结滤网',
    spec: '80目 · 316L不锈钢快装卡盘',
    applicableWorkshop: '提取浓缩车间',
    unit: '片',
    stockQty: 5,
    minThreshold: 3,
  },
  {
    id: 'part-dp04',
    partCode: 'BJ-DP04',
    name: '往复式切药机合金切片刀组',
    spec: '9CrSi 淬火刀片 400mm',
    applicableWorkshop: '前处理车间',
    unit: '副',
    stockQty: 2,
    minThreshold: 2,
  },
  {
    id: 'part-fd05',
    partCode: 'BJ-FD05',
    name: '沸腾制粒机防静电捕集布袋',
    spec: 'FL-200 导电丝混纺滤袋',
    applicableWorkshop: '制剂车间',
    unit: '套',
    stockQty: 1,
    minThreshold: 2,
  },
  {
    id: 'part-cm06',
    partCode: 'BJ-CM06',
    name: '旋转压片机异形浅凹冲模',
    spec: 'IPT-B 9mm 铬钼钢镀硬铬',
    applicableWorkshop: '制剂车间',
    unit: '付',
    stockQty: 35,
    minThreshold: 20,
  },
  {
    id: 'part-rf07',
    partCode: 'BJ-RF07',
    name: '泡罩机网纹热封上加热块',
    spec: '260型 220V/1.8kW 内置热电偶',
    applicableWorkshop: '包装车间',
    unit: '件',
    stockQty: 4,
    minThreshold: 2,
  },
  {
    id: 'part-cd08',
    partCode: 'BJ-CD08',
    name: '耐油高强力同步齿形传动带',
    spec: 'HTD-8M-1280 宽30mm',
    applicableWorkshop: '通用备件',
    unit: '条',
    stockQty: 6,
    minThreshold: 3,
  },
];

export interface SeedOrderInput {
  id: string;
  orderNo: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  workshop: Workshop;
  faultCategory: FaultCategory;
  urgency: RepairUrgency;
  description: string;
  status: RepairStatus;
  rootCause: string;
  resolution: string;
  downtimeMinutes: number;
  partsSummary: string;
}

export const SEED_ORDERS: SeedOrderInput[] = [
  {
    id: 'wo-202611-001',
    orderNo: 'WO-202611-001',
    equipmentId: 'eq-tq-101',
    equipmentCode: 'TQ-101',
    equipmentName: '多功能中药提取罐',
    workshop: '提取浓缩车间',
    faultCategory: '密封渗漏',
    urgency: 'critical',
    description: '早班升温水提过程中，罐底出渣门锁紧法兰处出现轻微蒸汽及药液滴漏，压力无法稳定维持在 0.08MPa。',
    status: 'pending',
    rootCause: '',
    resolution: '',
    downtimeMinutes: 0,
    partsSummary: '',
  },
  {
    id: 'wo-202611-002',
    orderNo: 'WO-202611-002',
    equipmentId: 'eq-qcl-04',
    equipmentCode: 'QCL-04',
    equipmentName: '水冷式超微粉碎机',
    workshop: '前处理车间',
    faultCategory: '机械传动',
    urgency: 'high',
    description: '粉碎黄芪饮片时主轴轴承座异响，伴随驱动皮带打滑发热，出料细度明显变粗。',
    status: 'in_progress',
    rootCause: '主轴传动端轴承润滑脂干涸并出现同步带齿面磨损',
    resolution: '正在拆解更换驱动同步齿形带并重新加注高温食品级润滑脂',
    downtimeMinutes: 95,
    partsSummary: '耐油高强力同步齿形传动带 x1',
  },
  {
    id: 'wo-202611-003',
    orderNo: 'WO-202611-003',
    equipmentId: 'eq-qcl-02',
    equipmentCode: 'QCL-02',
    equipmentName: '往复式中药切药机',
    workshop: '前处理车间',
    faultCategory: '清洁与筛网',
    urgency: 'normal',
    description: '切制甘草片时边缘偶有连刀毛刺，建议核查刀片间隙并完成刀片更换与试切。',
    status: 'verifying',
    rootCause: '合金切片刀片刃口连续切制硬质根茎类药材后轻度钝化',
    resolution: '已更换备品刀片并校准压料履带与刀盘间隙至 0.2mm，空载试运行正常。',
    downtimeMinutes: 40,
    partsSummary: '往复式中药切药机合金切片刀组 x1',
  },
  {
    id: 'wo-202611-004',
    orderNo: 'WO-202611-004',
    equipmentId: 'eq-bz-301',
    equipmentCode: 'BZ-301',
    equipmentName: '平板式铝塑泡罩包装机',
    workshop: '包装车间',
    faultCategory: '温压异常',
    urgency: 'normal',
    description: '铝箔热封工位温控表波动 ±6℃，导致泡罩边角偶发密封纹路浅。',
    status: 'closed',
    rootCause: '热封上加热块热电偶探头接线端子氧化松动，采样信号漂移',
    resolution: '紧固热电偶端子并重新做 PID 温控自整定，165℃ 稳态波动回归 ±1℃ 内。',
    downtimeMinutes: 35,
    partsSummary: '无备件消耗',
  },
];

export interface SeedInspectionInput {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  workshop: Workshop;
  shift: ShiftType;
  overallResult: 'pass' | 'abnormal';
  summaryNote: string;
  checkItemsSummary: string;
  linkedOrderNo: string;
}

export const SEED_INSPECTIONS: SeedInspectionInput[] = [
  {
    id: 'ins-202611-01',
    equipmentId: 'eq-tq-101',
    equipmentCode: 'TQ-101',
    equipmentName: '多功能中药提取罐',
    workshop: '提取浓缩车间',
    shift: '早班',
    overallResult: 'abnormal',
    summaryNote: '出渣门密封圈局部老化渗汽，已直通报修停机待修。',
    checkItemsSummary: '4/5 项正常 · 异常：人孔、排渣门硅胶密封圈完好，无蒸汽或药液渗漏',
    linkedOrderNo: 'WO-202611-001',
  },
  {
    id: 'ins-202611-02',
    equipmentId: 'eq-tq-102',
    equipmentCode: 'TQ-102',
    equipmentName: '双效节能真空浓缩器',
    workshop: '提取浓缩车间',
    shift: '早班',
    overallResult: 'pass',
    summaryNote: '真空度 -0.085MPa 稳态达标，冷凝水排放顺畅。',
    checkItemsSummary: '5/5 项全部合格',
    linkedOrderNo: '',
  },
  {
    id: 'ins-202611-03',
    equipmentId: 'eq-zj-202',
    equipmentCode: 'ZJ-202',
    equipmentName: '高速旋转压片机',
    workshop: '制剂车间',
    shift: '早班',
    overallResult: 'pass',
    summaryNote: '35副冲模逐一检查无卷边粘冲，主压力曲线平稳。',
    checkItemsSummary: '5/5 项全部合格',
    linkedOrderNo: '',
  },
  {
    id: 'ins-202611-04',
    equipmentId: 'eq-bz-301',
    equipmentCode: 'BZ-301',
    equipmentName: '平板式铝塑泡罩包装机',
    workshop: '包装车间',
    shift: '早班',
    overallResult: 'pass',
    summaryNote: '热封温度 165℃ 稳定，打码及视觉剔废联动测试通过。',
    checkItemsSummary: '5/5 项全部合格',
    linkedOrderNo: '',
  },
];

export interface SeedLogInput {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  eventType: LifecycleEventType;
  title: string;
  detail: string;
}

export const SEED_LOGS: SeedLogInput[] = [
  {
    id: 'log-01',
    equipmentId: 'eq-tq-101',
    equipmentCode: 'TQ-101',
    eventType: 'commissioned',
    title: '设备完成 3Q 验证并投产',
    detail: '3000L 多功能提取罐完成水压试验与 GMP 清场验证，转入在役运行阶段。',
  },
  {
    id: 'log-02',
    equipmentId: 'eq-tq-101',
    equipmentCode: 'TQ-101',
    eventType: 'repair_opened',
    title: '早班点检触发紧急报修 [WO-202611-001]',
    detail: '出渣门法兰密封渗汽，已停机等待维修团队更换硅胶密封圈。',
  },
  {
    id: 'log-03',
    equipmentId: 'eq-qcl-04',
    equipmentCode: 'QCL-04',
    eventType: 'stage_change',
    title: '生命周期阶段切换：在役运行 → 大修维保',
    detail: '因主轴轴承磨损与皮带老化，转入大修维保并关联工单 WO-202611-002。',
  },
  {
    id: 'log-04',
    equipmentId: 'eq-bz-301',
    equipmentCode: 'BZ-301',
    eventType: 'repair_closed',
    title: '故障工单验收闭环 [WO-202611-004]',
    detail: '热封温控 PID 重新校准完成，总停机 35 分钟，设备恢复正常运行。',
  },
];
