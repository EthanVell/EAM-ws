import { useMemo, useState } from 'react';
import { AlertTriangle, PackagePlus, Plus, Search } from 'lucide-react';
import { SparePart, WORKSHOPS, Workshop } from '../types/eam';

interface SparePartsViewProps {
  spareParts: SparePart[];
  isSupervisor: boolean;
  onRestockPart: (part: SparePart, addQty: number) => Promise<void>;
  onCreatePart: (input: {
    partCode: string;
    name: string;
    spec: string;
    applicableWorkshop: '通用备件' | Workshop;
    unit: string;
    stockQty: number;
    minThreshold: number;
  }) => Promise<void>;
}

export function SparePartsView({
  spareParts,
  isSupervisor,
  onRestockPart,
  onCreatePart,
}: SparePartsViewProps) {
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState<number>(5);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [newWorkshop, setNewWorkshop] = useState<'通用备件' | Workshop>('通用备件');
  const [newUnit, setNewUnit] = useState('套');
  const [newQty, setNewQty] = useState(5);
  const [newMin, setNewMin] = useState(2);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return spareParts
      .filter((p) => {
        if (onlyLow && p.stockQty > p.minThreshold) return false;
        if (
          q &&
          !p.partCode.toLowerCase().includes(q) &&
          !p.name.toLowerCase().includes(q) &&
          !p.spec.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.partCode.localeCompare(b.partCode));
  }, [spareParts, search, onlyLow]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    setSaving(true);
    try {
      await onCreatePart({
        partCode: newCode,
        name: newName,
        spec: newSpec || '标准件',
        applicableWorkshop: newWorkshop,
        unit: newUnit,
        stockQty: newQty,
        minThreshold: newMin,
      });
      setShowAddForm(false);
      setNewCode('');
      setNewName('');
      setNewSpec('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索备件编码、名称或规格..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(e) => setOnlyLow(e.target.checked)}
              className="rounded border-slate-300 text-emerald-700"
            />
            <span>仅看低库存预警</span>
          </label>
        </div>

        {isSupervisor && (
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增备件品类</span>
          </button>
        )}
      </div>

      {isSupervisor && showAddForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div>
            <label className="block text-xs text-slate-600 mb-1">备件编码 (字母数字)</label>
            <input
              required
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="如 BJ-ZJ09"
              className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">备件名称</label>
            <input
              required
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="如 氟橡胶O型圈"
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">规格型号</label>
            <input
              type="text"
              value={newSpec}
              onChange={(e) => setNewSpec(e.target.value)}
              placeholder="如 DN50 耐高温"
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">适用车间</label>
            <select
              value={newWorkshop}
              onChange={(e) =>
                setNewWorkshop(e.target.value as '通用备件' | Workshop)
              }
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="通用备件">通用备件</option>
              {WORKSHOPS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">单位</label>
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">初始库存</label>
            <input
              type="number"
              min={0}
              value={newQty}
              onChange={(e) => setNewQty(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">安全库存阈值</label>
            <input
              type="number"
              min={0}
              value={newMin}
              onChange={(e) => setNewMin(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-md cursor-pointer"
            >
              {saving ? '保存中...' : '确认入库'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-slate-600 cursor-pointer"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4 whitespace-nowrap">备件编码</th>
                <th className="py-2.5 px-4 whitespace-nowrap">名称与规格</th>
                <th className="py-2.5 px-4 whitespace-nowrap">适用车间</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">当前库存</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">安全下限</th>
                <th className="py-2.5 px-4 whitespace-nowrap">库存状态</th>
                {isSupervisor && (
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">补货操作</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((part) => {
                const isLow = part.stockQty <= part.minThreshold;
                return (
                  <tr key={part.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {part.partCode}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{part.name}</div>
                      <div className="text-xs text-slate-500">{part.spec}</div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {part.applicableWorkshop}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {part.stockQty} {part.unit}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                      {part.minThreshold} {part.unit}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>低于安全线</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-700">库存充足</span>
                      )}
                    </td>
                    {isSupervisor && (
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {restockingId === part.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={addAmount}
                              onChange={(e) => setAddAmount(Number(e.target.value))}
                              className="w-16 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                await onRestockPart(part, addAmount);
                                setRestockingId(null);
                              }}
                              className="px-2.5 py-1 text-xs bg-emerald-700 text-white rounded cursor-pointer"
                            >
                              入库
                            </button>
                            <button
                              type="button"
                              onClick={() => setRestockingId(null)}
                              className="px-2 py-1 text-xs text-slate-500 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRestockingId(part.id);
                              setAddAmount(5);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 rounded-md cursor-pointer"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>补货入库</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
