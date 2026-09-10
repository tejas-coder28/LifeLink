import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../api/analyticsApi';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import { Package, Save, CheckCircle2 } from 'lucide-react';

const InventoryManager = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getHospitals();
      if (res.data && res.data.success && res.data.data.length > 0) {
        setInventory(res.data.data[0].inventory || []);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleUnitsChange = (bloodGroup, newUnits) => {
    const units = Math.max(0, parseInt(newUnits) || 0);
    setInventory((prev) =>
      prev.map((item) => (item.bloodGroup === bloodGroup ? { ...item, units } : item))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await analyticsApi.updateHospitalInventory(inventory);
      if (res.data && res.data.success) {
        setMsg('Inventory updated successfully!');
      }
    } catch (err) {
      alert('Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading blood inventory database..." />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Blood Bank Inventory Control</h1>
        <p className="text-black text-sm">
          Update real-time available blood unit stocks for regional emergency supply queries.
        </p>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm font-semibold flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
          {msg}
        </div>
      )}

      <Card title="Live Stock Levels (Units)" icon={Package} hover={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {inventory.map((item) => (
            <div
              key={item.bloodGroup}
              className="flex items-center justify-between p-3 bg-lightbg/80 rounded-xl border border-slate-200"
            >
              <span className="font-extrabold text-rose-400 text-base">{item.bloodGroup}</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  value={item.units}
                  onChange={(e) => handleUnitsChange(item.bloodGroup, e.target.value)}
                  className="w-20 bg-slate-950 text-white text-center font-bold px-3 py-1.5 rounded-lg border border-slate-200 focus:border-sky-500 focus:outline-none"
                />
                <span className="text-xs text-black">units</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Updating Inventory...' : 'Save Inventory Stock'}</span>
        </button>
      </Card>
    </div>
  );
};

export default InventoryManager;
