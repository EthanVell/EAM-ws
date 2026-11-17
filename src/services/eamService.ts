import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  SEED_EQUIPMENT,
  SEED_INSPECTIONS,
  SEED_LOGS,
  SEED_ORDERS,
  SEED_SPARE_PARTS,
} from '../data/seedTcmData';
import {
  clampStr,
  Equipment,
  FACTORY_ID,
  FaultCategory,
  HealthStatus,
  InspectionRecord,
  LifecycleLog,
  LifecycleStage,
  RepairOrder,
  RepairUrgency,
  sanitizeCode,
  ShiftType,
  SparePart,
  UserProfile,
  UserRole,
  UserWorkshop,
  Workshop,
} from '../types/eam';

function genId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${randomPart}`;
}

function genOrderNo(): string {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const tail = String(Math.floor(100 + Math.random() * 899));
  return `WO-${ym}-${tail}`;
}

function nowFormatted(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

function computeNextDate(days: number): string {
  const d = new Date(Date.now() + Math.max(1, days) * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function subscribeFactoryCollection<T>(
  collectionName: string,
  onData: (items: T[]) => void
) {
  const q = query(
    collection(db, collectionName),
    where('factoryId', '==', FACTORY_ID)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as T);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}

export async function fetchUserPrivateEmail(uid: string): Promise<string> {
  const path = `users/${uid}/private/contact`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'contact'));
    if (snap.exists()) {
      return String((snap.data() as { email?: string }).email || '');
    }
    return '';
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function seedFactoryData(actor: UserProfile): Promise<void> {
  try {
    const batch1 = writeBatch(db);

    for (const eq of SEED_EQUIPMENT) {
      batch1.set(doc(db, 'equipment', eq.id), {
        ...eq,
        factoryId: FACTORY_ID,
        createdBy: actor.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const part of SEED_SPARE_PARTS) {
      batch1.set(doc(db, 'spareParts', part.id), {
        ...part,
        factoryId: FACTORY_ID,
        updatedBy: actor.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch1.commit();

    const batch2 = writeBatch(db);

    for (const order of SEED_ORDERS) {
      batch2.set(doc(db, 'repairOrders', order.id), {
        ...order,
        factoryId: FACTORY_ID,
        reporterUid: actor.uid,
        reporterName: clampStr(actor.displayName || '设备主管', 80),
        assigneeUid: order.status === 'pending' ? '' : actor.uid,
        assigneeName:
          order.status === 'pending'
            ? '待派单'
            : clampStr(actor.displayName || '设备主管', 80),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const ins of SEED_INSPECTIONS) {
      batch2.set(doc(db, 'inspections', ins.id), {
        ...ins,
        factoryId: FACTORY_ID,
        inspectorUid: actor.uid,
        inspectorName: clampStr(actor.displayName || '设备主管', 80),
        createdAt: serverTimestamp(),
      });
    }

    for (const log of SEED_LOGS) {
      batch2.set(doc(db, 'lifecycleLogs', log.id), {
        ...log,
        factoryId: FACTORY_ID,
        actorUid: actor.uid,
        actorName: clampStr(actor.displayName || '设备主管', 80),
        createdAt: serverTimestamp(),
      });
    }

    await batch2.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedFactoryData');
  }
}

export interface CreateEquipmentPayload {
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
}

export async function createEquipment(
  input: CreateEquipmentPayload,
  actor: UserProfile
): Promise<void> {
  const id = genId('eq');
  const cleanCode = sanitizeCode(input.code) || `EQ-${Date.now().toString().slice(-4)}`;
  const batch = writeBatch(db);

  try {
    batch.set(doc(db, 'equipment', id), {
      id,
      factoryId: FACTORY_ID,
      code: cleanCode,
      name: clampStr(input.name, 100),
      workshop: input.workshop,
      processSection: clampStr(input.processSection, 64),
      model: clampStr(input.model, 80),
      manufacturer: clampStr(input.manufacturer, 100),
      specs: clampStr(input.specs, 200),
      installDate: clampStr(input.installDate, 32),
      maintenanceCycleDays: Math.min(3650, Math.max(1, Math.round(input.maintenanceCycleDays))),
      lifecycleStage: input.lifecycleStage,
      healthStatus: 'normal',
      lastInspectedAt: '尚未点检',
      nextMaintenanceDate: computeNextDate(input.maintenanceCycleDays),
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logId = genId('log');
    batch.set(doc(db, 'lifecycleLogs', logId), {
      id: logId,
      factoryId: FACTORY_ID,
      equipmentId: id,
      equipmentCode: cleanCode,
      eventType: 'commissioned',
      title: `设备建档入库 [${cleanCode}]`,
      detail: clampStr(
        `${input.workshop} · ${input.processSection} · 型号 ${input.model} 建档完成`,
        500
      ),
      actorUid: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `equipment/${id}`);
  }
}

export async function updateEquipmentLifecycle(
  equipment: Equipment,
  nextStage: LifecycleStage,
  note: string,
  actor: UserProfile
): Promise<void> {
  const batch = writeBatch(db);
  const nextHealth: HealthStatus =
    nextStage === 'scrapped' || nextStage === 'sealed'
      ? 'attention'
      : nextStage === 'overhaul'
        ? 'repairing'
        : equipment.healthStatus === 'repairing'
          ? 'normal'
          : equipment.healthStatus;

  try {
    batch.update(doc(db, 'equipment', equipment.id), {
      lifecycleStage: nextStage,
      healthStatus: nextHealth,
      updatedAt: serverTimestamp(),
    });

    const logId = genId('log');
    const stageLabels: Record<LifecycleStage, string> = {
      commissioning: '安装验收',
      active: '在役运行',
      overhaul: '大修维保',
      sealed: '封存停用',
      scrapped: '报废注销',
    };

    batch.set(doc(db, 'lifecycleLogs', logId), {
      id: logId,
      factoryId: FACTORY_ID,
      equipmentId: equipment.id,
      equipmentCode: equipment.code,
      eventType: 'stage_change',
      title: `生命周期变更：${stageLabels[equipment.lifecycleStage]} → ${stageLabels[nextStage]}`,
      detail: clampStr(note || `由 ${actor.displayName} 调整设备生命周期阶段`, 500),
      actorUid: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `equipment/${equipment.id}`);
  }
}

export async function createRepairOrder(
  input: {
    equipment: Equipment;
    faultCategory: FaultCategory;
    urgency: RepairUrgency;
    description: string;
  },
  actor: UserProfile
): Promise<string> {
  const id = genId('wo');
  const orderNo = genOrderNo();
  const batch = writeBatch(db);

  const nextHealth: HealthStatus =
    input.urgency === 'critical' ? 'stopped' : 'repairing';

  try {
    batch.set(doc(db, 'repairOrders', id), {
      id,
      factoryId: FACTORY_ID,
      orderNo,
      equipmentId: input.equipment.id,
      equipmentCode: input.equipment.code,
      equipmentName: input.equipment.name,
      workshop: input.equipment.workshop,
      reporterUid: actor.uid,
      reporterName: actor.displayName,
      assigneeUid: '',
      assigneeName: '待派单',
      faultCategory: input.faultCategory,
      urgency: input.urgency,
      description: clampStr(input.description, 600),
      status: 'pending',
      rootCause: '',
      resolution: '',
      downtimeMinutes: 0,
      partsSummary: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'equipment', input.equipment.id), {
      healthStatus: nextHealth,
      updatedAt: serverTimestamp(),
    });

    const logId = genId('log');
    batch.set(doc(db, 'lifecycleLogs', logId), {
      id: logId,
      factoryId: FACTORY_ID,
      equipmentId: input.equipment.id,
      equipmentCode: input.equipment.code,
      eventType: 'repair_opened',
      title: `提交故障报修 [${orderNo}]`,
      detail: clampStr(`${input.faultCategory} · ${input.description}`, 500),
      actorUid: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return orderNo;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `repairOrders/${id}`);
  }
}

export async function claimRepairOrder(
  order: RepairOrder,
  actor: UserProfile
): Promise<void> {
  try {
    await updateDoc(doc(db, 'repairOrders', order.id), {
      assigneeUid: actor.uid,
      assigneeName: clampStr(actor.displayName, 80),
      status: 'in_progress',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `repairOrders/${order.id}`);
  }
}

export async function assignRepairOrder(
  order: RepairOrder,
  assignee: UserProfile
): Promise<void> {
  try {
    await updateDoc(doc(db, 'repairOrders', order.id), {
      assigneeUid: assignee.uid,
      assigneeName: clampStr(assignee.displayName, 80),
      status: order.status === 'pending' ? 'in_progress' : order.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `repairOrders/${order.id}`);
  }
}

export async function submitRepairCompletion(
  order: RepairOrder,
  payload: {
    rootCause: string;
    resolution: string;
    downtimeMinutes: number;
    consumedParts: { part: SparePart; qty: number }[];
  },
  actor: UserProfile
): Promise<void> {
  const batch = writeBatch(db);
  const partsSummary =
    payload.consumedParts.length > 0
      ? clampStr(
          payload.consumedParts
            .map((p) => `${p.part.name} x${p.qty}${p.part.unit}`)
            .join('，'),
          300
        )
      : '无备件消耗';

  try {
    batch.update(doc(db, 'repairOrders', order.id), {
      assigneeUid: order.assigneeUid || actor.uid,
      assigneeName:
        order.assigneeName && order.assigneeName !== '待派单'
          ? order.assigneeName
          : clampStr(actor.displayName, 80),
      status: 'verifying',
      rootCause: clampStr(payload.rootCause, 400),
      resolution: clampStr(payload.resolution, 600),
      downtimeMinutes: Math.max(0, Math.min(100000, Math.round(payload.downtimeMinutes))),
      partsSummary,
      updatedAt: serverTimestamp(),
    });

    for (const item of payload.consumedParts) {
      if (item.qty > 0) {
        const nextQty = Math.max(0, item.part.stockQty - item.qty);
        batch.update(doc(db, 'spareParts', item.part.id), {
          stockQty: nextQty,
          updatedBy: actor.uid,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `repairOrders/${order.id}`);
  }
}

export async function verifyAndCloseRepairOrder(
  order: RepairOrder,
  equipment: Equipment | undefined,
  actor: UserProfile
): Promise<void> {
  const batch = writeBatch(db);
  try {
    batch.update(doc(db, 'repairOrders', order.id), {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });

    if (equipment) {
      batch.update(doc(db, 'equipment', equipment.id), {
        healthStatus: 'normal',
        nextMaintenanceDate: computeNextDate(equipment.maintenanceCycleDays),
        updatedAt: serverTimestamp(),
      });
    }

    const logId = genId('log');
    batch.set(doc(db, 'lifecycleLogs', logId), {
      id: logId,
      factoryId: FACTORY_ID,
      equipmentId: order.equipmentId,
      equipmentCode: order.equipmentCode,
      eventType: 'repair_closed',
      title: `工单验收闭环 [${order.orderNo}]`,
      detail: clampStr(
        `${order.resolution || '试机运行正常'} · 停机 ${order.downtimeMinutes} 分钟 · 备件：${
          order.partsSummary || '无'
        }`,
        500
      ),
      actorUid: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `repairOrders/${order.id}`);
  }
}

export async function submitDailyInspection(
  params: {
    equipment: Equipment;
    shift: ShiftType;
    items: { label: string; ok: boolean }[];
    summaryNote: string;
    createOrderIfAbnormal: boolean;
    faultCategory: FaultCategory;
    urgency: RepairUrgency;
    faultDescription: string;
  },
  actor: UserProfile
): Promise<{ orderNo: string }> {
  const batch = writeBatch(db);
  const insId = genId('ins');
  const abnormalItems = params.items.filter((i) => !i.ok);
  const overallResult = abnormalItems.length > 0 ? 'abnormal' : 'pass';
  const checkItemsSummary = clampStr(
    abnormalItems.length === 0
      ? `${params.items.length}/${params.items.length} 项全部合格`
      : `${params.items.length - abnormalItems.length}/${
          params.items.length
        } 项正常 · 异常：${abnormalItems.map((a) => a.label).join('；')}`,
    1000
  );

  let linkedOrderNo = '';
  let nextHealth: HealthStatus =
    overallResult === 'pass' ? 'normal' : 'attention';

  try {
    if (overallResult === 'abnormal' && params.createOrderIfAbnormal) {
      const orderId = genId('wo');
      linkedOrderNo = genOrderNo();
      nextHealth = params.urgency === 'critical' ? 'stopped' : 'repairing';

      batch.set(doc(db, 'repairOrders', orderId), {
        id: orderId,
        factoryId: FACTORY_ID,
        orderNo: linkedOrderNo,
        equipmentId: params.equipment.id,
        equipmentCode: params.equipment.code,
        equipmentName: params.equipment.name,
        workshop: params.equipment.workshop,
        reporterUid: actor.uid,
        reporterName: actor.displayName,
        assigneeUid: '',
        assigneeName: '待派单',
        faultCategory: params.faultCategory,
        urgency: params.urgency,
        description: clampStr(
          params.faultDescription ||
            `${params.shift}点检异常：${abnormalItems.map((a) => a.label).join('；')}`,
          600
        ),
        status: 'pending',
        rootCause: '',
        resolution: '',
        downtimeMinutes: 0,
        partsSummary: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const orderLogId = genId('log');
      batch.set(doc(db, 'lifecycleLogs', orderLogId), {
        id: orderLogId,
        factoryId: FACTORY_ID,
        equipmentId: params.equipment.id,
        equipmentCode: params.equipment.code,
        eventType: 'repair_opened',
        title: `点检异常直通报修 [${linkedOrderNo}]`,
        detail: clampStr(params.faultDescription || checkItemsSummary, 500),
        actorUid: actor.uid,
        actorName: actor.displayName,
        createdAt: serverTimestamp(),
      });
    }

    batch.set(doc(db, 'inspections', insId), {
      id: insId,
      factoryId: FACTORY_ID,
      equipmentId: params.equipment.id,
      equipmentCode: params.equipment.code,
      equipmentName: params.equipment.name,
      workshop: params.equipment.workshop,
      inspectorUid: actor.uid,
      inspectorName: actor.displayName,
      shift: params.shift,
      overallResult,
      summaryNote: clampStr(params.summaryNote || (overallResult === 'pass' ? '设备运行平稳，点检合格。' : '发现异常项，请跟进处理。'), 500),
      checkItemsSummary,
      linkedOrderNo,
      createdAt: serverTimestamp(),
    });

    // Only keep repairing/stopped if already repairing/stopped and pass isn't overriding active repair
    const effectiveHealth =
      params.equipment.healthStatus === 'repairing' ||
      params.equipment.healthStatus === 'stopped'
        ? params.equipment.healthStatus
        : nextHealth;

    batch.update(doc(db, 'equipment', params.equipment.id), {
      lastInspectedAt: nowFormatted(),
      healthStatus: effectiveHealth,
      updatedAt: serverTimestamp(),
    });

    const insLogId = genId('log');
    batch.set(doc(db, 'lifecycleLogs', insLogId), {
      id: insLogId,
      factoryId: FACTORY_ID,
      equipmentId: params.equipment.id,
      equipmentCode: params.equipment.code,
      eventType: 'inspection',
      title: `${params.shift}日常点检 · ${overallResult === 'pass' ? '合格' : '发现异常'}`,
      detail: clampStr(`${checkItemsSummary}${params.summaryNote ? ` · ${params.summaryNote}` : ''}`, 500),
      actorUid: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return { orderNo: linkedOrderNo };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `inspections/${insId}`);
  }
}

export async function createSparePart(
  input: {
    partCode: string;
    name: string;
    spec: string;
    applicableWorkshop: '通用备件' | Workshop;
    unit: string;
    stockQty: number;
    minThreshold: number;
  },
  actor: UserProfile
): Promise<void> {
  const id = genId('part');
  const cleanCode = sanitizeCode(input.partCode) || `BJ-${Date.now().toString().slice(-4)}`;
  const batch = writeBatch(db);
  try {
    batch.set(doc(db, 'spareParts', id), {
      id,
      factoryId: FACTORY_ID,
      partCode: cleanCode,
      name: clampStr(input.name, 100),
      spec: clampStr(input.spec, 120),
      applicableWorkshop: input.applicableWorkshop,
      unit: clampStr(input.unit || '件', 16),
      stockQty: Math.max(0, Math.round(input.stockQty)),
      minThreshold: Math.max(0, Math.round(input.minThreshold)),
      updatedBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `spareParts/${id}`);
  }
}

export async function restockSparePart(
  part: SparePart,
  addQty: number,
  actor: UserProfile
): Promise<void> {
  const nextQty = Math.max(0, Math.min(100000, part.stockQty + Math.round(addQty)));
  try {
    await updateDoc(doc(db, 'spareParts', part.id), {
      stockQty: nextQty,
      updatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `spareParts/${part.id}`);
  }
}

export async function updateUserRoleAndWorkshop(
  targetUid: string,
  role: UserRole,
  workshop: UserWorkshop
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      role,
      workshop,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
  }
}

export type FactorySubscriptions = {
  equipment: Equipment[];
  orders: RepairOrder[];
  inspections: InspectionRecord[];
  spareParts: SparePart[];
  logs: LifecycleLog[];
  users: UserProfile[];
};
