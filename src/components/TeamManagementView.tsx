import { useEffect, useState } from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import {
  ROLE_META,
  UserProfile,
  UserRole,
  UserWorkshop,
  WORKSHOPS,
} from '../types/eam';
import { fetchUserPrivateEmail } from '../services/eamService';

interface TeamManagementViewProps {
  users: UserProfile[];
  currentUserId: string;
  isSupervisor: boolean;
  onUpdateMember: (
    uid: string,
    role: UserRole,
    workshop: UserWorkshop
  ) => Promise<void>;
}

export function TeamManagementView({
  users,
  currentUserId,
  isSupervisor,
  onUpdateMember,
}: TeamManagementViewProps) {
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupervisor) return;
    let active = true;
    Promise.all(
      users.map(async (u) => {
        try {
          const email = await fetchUserPrivateEmail(u.uid);
          return [u.uid, email] as const;
        } catch {
          return [u.uid, ''] as const;
        }
      })
    ).then((pairs) => {
      if (!active) return;
      const map: Record<string, string> = {};
      for (const [uid, email] of pairs) {
        map[uid] = email;
      }
      setEmails(map);
    });
    return () => {
      active = false;
    };
  }, [users, isSupervisor]);

  return (
    <div className="space-y-6">
      {/* Role matrix explanation */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['operator', 'technician', 'supervisor'] as UserRole[]).map((r) => (
          <div key={r} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{ROLE_META[r].label}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {ROLE_META[r].description}
            </p>
          </div>
        ))}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              工厂云端成员与角色授权 ({users.length})
            </h2>
          </div>
          {!isSupervisor && (
            <span className="text-xs text-slate-500">
              仅设备主管可调整他人角色与所属车间
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4 whitespace-nowrap">成员姓名</th>
                {isSupervisor && (
                  <th className="py-2.5 px-4 whitespace-nowrap">绑定账号邮箱</th>
                )}
                <th className="py-2.5 px-4 whitespace-nowrap">所属车间</th>
                <th className="py-2.5 px-4 whitespace-nowrap">系统权限角色</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map((u) => {
                const isSelf = u.uid === currentUserId;
                const disabled = !isSupervisor || savingUid === u.uid;
                return (
                  <tr key={u.uid} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900">{u.displayName}</span>
                      {isSelf && (
                        <span className="ml-2 text-xs text-emerald-700 font-medium">
                          (当前登录)
                        </span>
                      )}
                    </td>
                    {isSupervisor && (
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {emails[u.uid] || '—'}
                      </td>
                    )}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        aria-label={`${u.displayName} 所属车间`}
                        value={u.workshop}
                        disabled={disabled}
                        onChange={async (e) => {
                          setSavingUid(u.uid);
                          try {
                            await onUpdateMember(
                              u.uid,
                              u.role,
                              e.target.value as UserWorkshop
                            );
                          } finally {
                            setSavingUid(null);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-600"
                      >
                        <option value="全厂统筹">全厂统筹</option>
                        {WORKSHOPS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        aria-label={`${u.displayName} 角色权限`}
                        value={u.role}
                        disabled={disabled || isSelf}
                        onChange={async (e) => {
                          setSavingUid(u.uid);
                          try {
                            await onUpdateMember(
                              u.uid,
                              e.target.value as UserRole,
                              u.workshop
                            );
                          } finally {
                            setSavingUid(null);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-600"
                      >
                        <option value="operator">车间操作员</option>
                        <option value="technician">维修工程师</option>
                        <option value="supervisor">设备主管</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
