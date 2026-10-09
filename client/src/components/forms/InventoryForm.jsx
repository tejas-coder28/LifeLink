import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save } from 'lucide-react';
import { BLOOD_GROUPS } from '../../utils/bloodCompatibility';

const InventoryForm = ({ initialInventory = [], onSubmit, loading }) => {
  const initializeItems = (inv) => {
    const map = Object.fromEntries((inv || []).map((item) => [item.bloodGroup, item.units]));
    return BLOOD_GROUPS.map((bg) => ({ bloodGroup: bg, units: map[bg] !== undefined ? map[bg] : 5 }));
  };

  const [items, setItems] = useState(initializeItems(initialInventory));

  useEffect(() => {
    if (initialInventory && initialInventory.length > 0) {
      setItems(initializeItems(initialInventory));
    }
  }, [initialInventory]);

  const handleUnitChange = (bg, delta) => {
    setItems((prev) =>
      prev.map((item) => item.bloodGroup === bg
        ? { ...item, units: Math.max(0, item.units + delta) }
        : item
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(items);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item) => {
          const isLow = item.units <= 2;
          const bgKey = item.bloodGroup.replace('+', 'p').replace('-', 'm');
          return (
            <div
              key={item.bloodGroup}
              className={`p-4 rounded-2xl flex flex-col items-center justify-between space-y-3 transition-all ${
                isLow
                  ? 'bg-rose-500/10 border-2 border-rose-500/50 shadow-sm'
                  : 'glass-card border-theme'
              }`}
            >
              <span className={`blood-pill blood-${bgKey}`}>
                🩸 {item.bloodGroup}
              </span>
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => handleUnitChange(item.bloodGroup, -1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-surface border border-theme text-primary hover:border-brand-500/40 transition-all shadow-sm cursor-pointer"
                  title="Decrease units"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  className={`text-2xl font-black min-w-[32px] text-center tabular-nums ${
                    isLow ? 'text-brand-500' : 'text-primary'
                  }`}
                >
                  {item.units}
                </span>
                <button
                  type="button"
                  onClick={() => handleUnitChange(item.bloodGroup, 1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs btn-primary p-0 shadow-md transition-all cursor-pointer"
                  title="Increase units"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  isLow ? 'text-brand-500 font-black' : 'text-muted'
                }`}
              >
                {isLow ? '⚠️ Low Stock' : 'Reserve Units'}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3.5 rounded-xl text-xs justify-center cursor-pointer"
      >
        <Save className="w-4 h-4" />
        <span>{loading ? 'Saving Blood Inventory...' : 'Save Hospital Inventory'}</span>
      </button>
    </form>
  );
};

export default InventoryForm;
