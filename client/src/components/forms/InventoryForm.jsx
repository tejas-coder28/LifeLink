import React, { useState } from 'react';
import Button from '../common/Button';
import { Plus, Minus, Save } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const InventoryForm = ({ initialData = [], onSubmit, loading = false }) => {
  const [items, setItems] = useState(() => {
    return BLOOD_GROUPS.map((bg) => {
      const found = initialData.find((d) => d.bloodGroup === bg);
      return { bloodGroup: bg, units: found ? found.units : 0 };
    });
  });

  const handleUnitChange = (bloodGroup, delta) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.bloodGroup === bloodGroup) {
          return { ...item, units: Math.max(0, item.units + delta) };
        }
        return item;
      })
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
          const isCritical = item.units === 0;
          const isLow = item.units > 0 && item.units <= 2;
          const bgKey = item.bloodGroup.replace('+', 'p').replace('-', 'm');
          return (
            <div
              key={item.bloodGroup}
              className={`p-4 rounded-2xl flex flex-col items-center justify-between space-y-3 transition-all ${
                isCritical
                  ? 'bg-danger/10 border-2 border-danger/50 shadow-sm'
                  : isLow
                  ? 'bg-warning/10 border-2 border-warning/50 shadow-sm'
                  : 'glass-card border-hairline'
              }`}
            >
              <span className={`blood-pill blood-${bgKey}`}>
                🩸 {item.bloodGroup}
              </span>
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => handleUnitChange(item.bloodGroup, -1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-surface border border-hairline text-primary hover:border-info/40 transition-all shadow-sm cursor-pointer"
                  title="Decrease units"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  className={`text-2xl font-black min-w-[32px] text-center tabular-nums ${
                    isCritical ? 'text-danger' : isLow ? 'text-warning' : 'text-primary'
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
                  isCritical ? 'text-danger dark:text-[#FF6166] font-black' : isLow ? 'text-warning dark:text-[#FCD34D] font-black' : 'text-muted'
                }`}
              >
                {isCritical ? '🚨 Critical Deficit' : isLow ? '⚠️ Low Stock' : 'Reserve Units'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-hairline">
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          icon={Save}
        >
          Save Inventory Changes
        </Button>
      </div>
    </form>
  );
};

export default InventoryForm;
