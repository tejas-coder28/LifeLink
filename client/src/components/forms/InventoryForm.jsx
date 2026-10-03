import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save } from 'lucide-react';
import { BLOOD_GROUPS } from '../../utils/bloodCompatibility';

/* colour tokens per blood group — unique so hospital staff can scan faster */
const BG_COLORS = {
  'A+':  { text: '#c4b5fd', border: 'rgba(167,139,250,0.40)', bg: 'rgba(167,139,250,0.10)' },
  'A-':  { text: '#c4b5fd', border: 'rgba(167,139,250,0.30)', bg: 'rgba(167,139,250,0.07)' },
  'B+':  { text: '#93c5fd', border: 'rgba(59,158,255,0.40)',  bg: 'rgba(59,158,255,0.10)'  },
  'B-':  { text: '#93c5fd', border: 'rgba(59,158,255,0.30)',  bg: 'rgba(59,158,255,0.07)'  },
  'AB+': { text: '#fcd34d', border: 'rgba(245,158,11,0.40)',  bg: 'rgba(245,158,11,0.10)'  },
  'AB-': { text: '#fcd34d', border: 'rgba(245,158,11,0.30)',  bg: 'rgba(245,158,11,0.07)'  },
  'O+':  { text: '#fca5a5', border: 'rgba(220,38,38,0.40)',   bg: 'rgba(220,38,38,0.10)'   },
  'O-':  { text: '#fca5a5', border: 'rgba(220,38,38,0.60)',   bg: 'rgba(220,38,38,0.15)',  glow: '0 0 10px rgba(220,38,38,0.35)' },
};

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
          return (
            <div
              key={item.bloodGroup}
              className={`p-4 rounded-2xl flex flex-col items-center justify-between space-y-3 transition-all ${
                isLow
                  ? 'bg-rose-500/10 border-2 border-rose-500/50 shadow-sm'
                  : 'glass-card border-theme'
              }`}
            >
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-primary border border-slate-200 dark:border-white/10">
                🩸 {item.bloodGroup}
              </span>
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => handleUnitChange(item.bloodGroup, -1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white border border-slate-300 dark:border-white/15 transition-all shadow-sm"
                  title="Decrease units"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  className={`text-2xl font-black min-w-[32px] text-center ${
                    isLow ? 'text-rose-600 dark:text-rose-400' : 'text-primary'
                  }`}
                >
                  {item.units}
                </span>
                <button
                  type="button"
                  onClick={() => handleUnitChange(item.bloodGroup, 1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md shadow-rose-600/30 transition-all"
                  title="Increase units"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  isLow ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-muted'
                }`}
              >
                {isLow ? '⚠️ Low Stock' : 'Reserve Units'}
              </span>
            </div>
          );
        })}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 rounded-xl text-xs justify-center">
        <Save className="w-4 h-4" />
        <span>{loading ? 'Saving Inventory...' : 'Update Blood Bank Inventory'}</span>
      </button>
    </form>
  );
};

export default InventoryForm;
