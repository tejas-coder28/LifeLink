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
          const isWarning = item.units >= 1 && item.units <= 3;
          const isSuccess = item.units >= 4;
          const bgKey = item.bloodGroup.replace('+', 'p').replace('-', 'm');
          return (
            <div
              key={item.bloodGroup}
              className={`glass-card p-4 rounded-2xl flex flex-col items-center justify-between space-y-3 transition-all border ${
                isCritical
                  ? 'border-urgency-critical/50'
                  : isWarning
                  ? 'border-urgency-medium/50'
                  : 'border-hairline-strong'
              }`}
            >
              <span className={`blood-pill blood-${bgKey}`}>
                🩸 {item.bloodGroup}
              </span>
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => handleUnitChange(item.bloodGroup, -1)}
                  className="btn-secondary w-9 h-9 rounded-xl p-0 flex items-center justify-center font-bold text-xs"
                  title="Decrease units"
                  aria-label={`Decrease ${item.bloodGroup} units`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span
                  className={`text-2xl font-black min-w-[36px] text-center tabular-nums ${
                    isCritical ? 'text-urgency-critical' : isWarning ? 'text-urgency-medium' : 'text-success'
                  }`}
                >
                  {item.units}
                </span>
                <button
                  type="button"
                  onClick={() => handleUnitChange(item.bloodGroup, 1)}
                  className="btn-action w-9 h-9 rounded-xl p-0 flex items-center justify-center font-bold text-xs"
                  title="Increase units"
                  aria-label={`Increase ${item.bloodGroup} units`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  isCritical
                    ? 'bg-urgency-critical-subtle text-urgency-critical border-urgency-critical-border'
                    : isWarning
                    ? 'bg-urgency-medium-subtle text-urgency-medium border-urgency-medium-border'
                    : 'bg-success/10 text-success border-success/30'
                }`}
              >
                {isCritical ? '0 units Critical' : isWarning ? `${item.units} units Low` : `${item.units} units In Stock`}
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
