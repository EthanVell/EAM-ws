import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppErrorBoundary } from './components/StatusPrimitives';
import { LoginPortal } from './components/LoginPortal';
import { AppShell, NavSection } from './components/AppShell';
import { DashboardView } from './components/DashboardView';
import { EquipmentLedgerView } from './components/EquipmentLedgerView';
import { EquipmentDrawer } from './components/EquipmentDrawer';
import { RepairOrdersView } from './components/RepairOrdersView';
import { InspectionsView } from './components/InspectionsView';
import { SparePartsView } from './components/SparePartsView';
import { TeamManagementView } from './components/TeamManagementView';
import {
  EquipmentFormModal,
  QuickReportModal,
  RepairCompletionModal,
} from './components/Modals';
import {
  assignRepairOrder,
  claimRepairOrder,
  createEquipment,
  createRepairOrder,
  createSparePart,
  restockSparePart,
  seedFactoryData,
  submitDailyInspection,
  submitRepairCompletion,
  subscribeFactoryCollection,
  updateEquipmentLifecycle,
  updateUserRoleAndWorkshop,
  verifyAndCloseRepairOrder,
} from './services/eamService';
import {
  Equipment,
  formatFirestoreTime,
  InspectionRecord,
  LifecycleLog,
  RepairOrder,
  SparePart,
  UserProfile,
  Workshop,
} from './types/eam';

function WorkspaceApp() {
  const { firebaseUser, profile, authReady, effectiveRole } = useAuth();

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [ledgerWorkshopFilter, setLedgerWorkshopFilter] = useState<
    Workshop | 'all'
  >('all');

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [logs, setLogs] = useState<LifecycleLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [drawerEquipId, setDrawerEquipId] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetEquip, setReportTargetEquip] = useState<Equipment | null>(null);
  const [equipFormOpen, setEquipFormOpen] = useState(false);
  const [completingOrder, setCompletingOrder] = useState<RepairOrder | null>(null);
  const [inspectionTargetEquip, setInspectionTargetEquip] =
    useState<Equipment | null>(null);

  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const deepLinkHandledRef = useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    if (!firebaseUser || !profile) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    let initialDone = false;
    const markReady = () => {
      if (!initialDone) {
        initialDone = true;
        setDataLoading(false);
      }
    };

    const unsubEq = subscribeFactoryCollection<Equipment>('equipment', (items) => {
      setEquipment(items);
      markReady();
      if (!deepLinkHandledRef.current) {
        const equipParam = new URLSearchParams(window.location.search).get('equip');
        if (equipParam && items.some((e) => e.id === equipParam)) {
          deepLinkHandledRef.current = true;
          setDrawerEquipId(equipParam);
        }
      }
    });
    const unsubOrders = subscribeFactoryCollection<RepairOrder>(
      'repairOrders',
      (items) => {
        const sorted = [...items].sort((a, b) =>
          formatFirestoreTime(b.createdAt).localeCompare(
            formatFirestoreTime(a.createdAt)
          )
        );
        setOrders(sorted);
      }
    );
    const unsubIns = subscribeFactoryCollection<InspectionRecord>(
      'inspections',
      (items) => {
        const sorted = [...items].sort((a, b) =>
          formatFirestoreTime(b.createdAt).localeCompare(
            formatFirestoreTime(a.createdAt)
          )
        );
        setInspections(sorted);
      }
    );
    const unsubParts = subscribeFactoryCollection<SparePart>(
      'spareParts',
      (items) => setSpareParts(items)
    );
    const unsubLogs = subscribeFactoryCollection<LifecycleLog>(
      'lifecycleLogs',
      (items) => setLogs(items)
    );
    const unsubUsers = subscribeFactoryCollection<UserProfile>('users', (items) =>
      setUsers(items)
    );

    return () => {
      unsubEq();
      unsubOrders();
      unsubIns();
      unsubParts();
      unsubLogs();
      unsubUsers();
    };
  }, [firebaseUser, profile]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-sm text-slate-500">正在加载工作台身份信息...</div>
      </div>
    );
  }

  if (!firebaseUser || !profile) {
    return <LoginPortal />;
  }

  const isSupervisor = effectiveRole === 'supervisor';
  const drawerEquipment =
    equipment.find((e) => e.id === drawerEquipId) || null;
  const openOrdersCount = orders.filter((o) => o.status !== 'closed').length;
  const lowStockCount = spareParts.filter(
    (p) => p.stockQty <= p.minThreshold
  ).length;

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedFactoryData(profile);
      showToast('已成功初始化四车间中药设备台账与示范工单');
    } finally {
      setSeeding(false);
    }
  };

  const handleNavigate = (section: NavSection, workshopFilter?: Workshop) => {
    if (section === 'equipment') {
      setLedgerWorkshopFilter(workshopFilter || 'all');
    }
    setActiveSection(section);
  };

  return (
    <AppShell
      activeSection={activeSection}
      onSelectSection={(sec) => handleNavigate(sec)}
      pendingOrderCount={openOrdersCount}
      lowStockCount={lowStockCount}
      onQuickReport={() => {
        setReportTargetEquip(null);
        setReportModalOpen(true);
      }}
    >
      {dataLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse"
              />
            ))}
          </div>
          <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {activeSection === 'dashboard' && (
            <DashboardView
              equipment={equipment}
              orders={orders}
              inspections={inspections}
              spareParts={spareParts}
              isSupervisor={isSupervisor}
              seeding={seeding}
              onSeedData={handleSeedData}
              onNavigate={handleNavigate}
              onSelectEquipment={(eq) => setDrawerEquipId(eq.id)}
              onInspectEquipment={(eq) => {
                setInspectionTargetEquip(eq);
                setActiveSection('inspections');
              }}
            />
          )}

          {activeSection === 'equipment' && (
            <EquipmentLedgerView
              key={ledgerWorkshopFilter}
              equipment={equipment}
              initialWorkshop={ledgerWorkshopFilter}
              isSupervisor={isSupervisor}
              onSelectEquipment={(eq) => setDrawerEquipId(eq.id)}
              onInspectEquipment={(eq) => {
                setInspectionTargetEquip(eq);
                setActiveSection('inspections');
              }}
              onReportEquipment={(eq) => {
                setReportTargetEquip(eq);
                setReportModalOpen(true);
              }}
              onAddEquipment={() => setEquipFormOpen(true)}
            />
          )}

          {activeSection === 'repairs' && (
            <RepairOrdersView
              orders={orders}
              users={users}
              effectiveRole={effectiveRole}
              currentUserId={profile.uid}
              onQuickReport={() => {
                setReportTargetEquip(null);
                setReportModalOpen(true);
              }}
              onClaimOrder={async (order) => {
                await claimRepairOrder(order, profile);
                showToast(`已接单处理 ${order.orderNo}`);
              }}
              onAssignOrder={async (order, assignee) => {
                await assignRepairOrder(order, assignee);
                showToast(`已将工单 ${order.orderNo} 指派给 ${assignee.displayName}`);
              }}
              onOpenCompletionModal={(order) => setCompletingOrder(order)}
              onVerifyAndClose={async (order) => {
                const eq = equipment.find((e) => e.id === order.equipmentId);
                await verifyAndCloseRepairOrder(order, eq, profile);
                showToast(`工单 ${order.orderNo} 已验收闭环，设备恢复正常运行`);
              }}
            />
          )}

          {activeSection === 'inspections' && (
            <InspectionsView
              equipment={equipment}
              inspections={inspections}
              initialEquipment={inspectionTargetEquip}
              onSubmitInspection={async (params) => {
                const res = await submitDailyInspection(params, profile);
                if (res.orderNo) {
                  showToast(`点检已保存，并直通生成故障报修单 ${res.orderNo}`);
                } else {
                  showToast(`${params.equipment.code} 日常点检记录已提交`);
                }
                return res.orderNo;
              }}
            />
          )}

          {activeSection === 'parts' && (
            <SparePartsView
              spareParts={spareParts}
              isSupervisor={isSupervisor}
              onRestockPart={async (part, addQty) => {
                await restockSparePart(part, addQty, profile);
                showToast(`${part.name} 已入库补充 ${addQty} ${part.unit}`);
              }}
              onCreatePart={async (input) => {
                await createSparePart(input, profile);
                showToast(`已新增备件 ${input.name}`);
              }}
            />
          )}

          {activeSection === 'team' && (
            <TeamManagementView
              users={users}
              currentUserId={profile.uid}
              isSupervisor={isSupervisor}
              onUpdateMember={async (uid, role, workshop) => {
                await updateUserRoleAndWorkshop(uid, role, workshop);
                showToast('成员岗位角色与所属车间已更新');
              }}
            />
          )}
        </>
      )}

      {/* Slide-over Equipment Lifecycle Drawer */}
      <EquipmentDrawer
        equipment={drawerEquipment}
        logs={logs}
        orders={orders}
        isSupervisor={isSupervisor}
        onClose={() => setDrawerEquipId(null)}
        onInspect={(eq) => {
          setDrawerEquipId(null);
          setInspectionTargetEquip(eq);
          setActiveSection('inspections');
        }}
        onReportFault={(eq) => {
          setDrawerEquipId(null);
          setReportTargetEquip(eq);
          setReportModalOpen(true);
        }}
        onChangeStage={async (eq, nextStage, note) => {
          await updateEquipmentLifecycle(eq, nextStage, note, profile);
          showToast(`${eq.code} 生命周期阶段已更新`);
        }}
        onNotify={showToast}
      />

      {/* Modals */}
      <QuickReportModal
        open={reportModalOpen}
        equipmentList={equipment}
        initialEquipment={reportTargetEquip}
        onClose={() => setReportModalOpen(false)}
        onSubmit={async (payload) => {
          const orderNo = await createRepairOrder(payload, profile);
          showToast(`已生成故障报修工单 ${orderNo}`);
        }}
      />

      <EquipmentFormModal
        open={equipFormOpen}
        onClose={() => setEquipFormOpen(false)}
        onSubmit={async (payload) => {
          await createEquipment(payload, profile);
          showToast(`新设备 ${payload.code} 已加入资产台账`);
        }}
      />

      <RepairCompletionModal
        order={completingOrder}
        spareParts={spareParts}
        onClose={() => setCompletingOrder(null)}
        onSubmit={async (order, payload) => {
          await submitRepairCompletion(order, payload, profile);
          showToast(`工单 ${order.orderNo} 已提交完工待验收`);
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-lg shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <WorkspaceApp />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
