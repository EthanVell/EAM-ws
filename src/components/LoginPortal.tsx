import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPortal() {
  const { signInWithGoogle, signingIn, authError } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] grid grid-cols-1 lg:grid-cols-12 items-stretch">
      {/* Left column: Brand & Auth */}
      <div className="lg:col-span-5 flex flex-col justify-between px-8 py-10 sm:px-14 sm:py-12 bg-white border-r border-slate-200">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            设备报修
          </span>
          <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
            EAM · GMP 洁净车间版
          </span>
        </div>

        <div className="my-12 max-w-md">
          <p className="text-xs font-medium text-emerald-700 tracking-wide mb-3">
            中医药智能制造设备协同平台
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight leading-tight text-balance mb-5">
            全流程中药车间设备台账与报修闭环
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8">
            覆盖前处理、提取浓缩、制剂与包装四大生产工段。将班前点检、故障报修、维修领料与设备生命周期履历整合为实时云端工作流。
          </p>

          <div className="space-y-3 mb-9 border-t border-slate-100 pt-6">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">班前点检直通报修</span>
                <span className="text-slate-500"> · 异常点检项一键生成故障工单并锁定设备状态</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wrench className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">四步闭环维修流转</span>
                <span className="text-slate-500"> · 报修、接单处理、领料扣库、试机验收可追溯</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">多角色权责分离</span>
                <span className="text-slate-500"> · 车间操作员、维修工程师与设备主管云端协同</span>
              </div>
            </div>
          </div>

          {authError && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>{signingIn ? '正在连接认证服务...' : '使用 Google 账号登录工作台'}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>

          <p className="mt-4 text-xs text-slate-500">
            首次登录将自动为您初始化工厂操作身份；设备主管可在团队权限中调整车间与角色。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-5">
          <span>前处理车间</span>
          <span aria-hidden="true">·</span>
          <span>提取浓缩车间</span>
          <span aria-hidden="true">·</span>
          <span>制剂车间</span>
          <span aria-hidden="true">·</span>
          <span>包装车间</span>
        </div>
      </div>

      {/* Right column: Cleanroom Visual */}
      <div className="lg:col-span-7 relative min-h-[340px] lg:min-h-screen bg-slate-900 overflow-hidden">
        {!imgFailed ? (
          <img
            src="/src/assets/images/tcm_gmp_facility_1794792669106.jpg"
            alt="现代 GMP 中药提取与浓缩洁净生产车间"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 via-emerald-950 to-slate-900 flex items-center justify-center p-12">
            <div className="text-center text-slate-300 space-y-3">
              <Activity className="w-12 h-12 mx-auto text-emerald-400" />
              <p className="font-display text-lg font-medium">GMP 中药数字化车间</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 sm:bottom-12 sm:left-12 sm:right-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
          <div className="max-w-lg">
            <p className="text-xs font-mono text-emerald-300 mb-1.5">
              提取浓缩核心工段 · 316L 卫生级不锈钢设备群
            </p>
            <p className="text-base sm:text-lg font-medium leading-snug text-white/95">
              以规范化台账与毫秒级故障响应，守护每一批次中药饮片与中成药的连续稳定生产。
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/85 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>云端实时同步</span>
          </div>
        </div>
      </div>
    </div>
  );
}
