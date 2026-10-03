import React, { useState, useEffect } from 'react';
import { hospitalApi } from '../../api/hospitalApi';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import InventoryForm from '../../components/forms/InventoryForm';
import { Building2 } from 'lucide-react';

const InventoryManagerPage = () => {
  const { showSuccess, showError } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await hospitalApi.getProfile();
        if (res.data && res.data.success) {
          setProfile(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load hospital profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdate = async (inventoryData) => {
    setSaving(true);
    try {
      const res = await hospitalApi.updateInventory(inventoryData);
      if (res.data && res.data.success) {
        setProfile(res.data.data);
        showSuccess('Blood inventory reserves updated!');
      }
    } catch (err) {
      showError('Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading hospital inventory..." />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 page-enter">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading tracking-tight">
          Hospital <span className="gradient-text-brand">Inventory Manager</span>
        </h1>
        <p className="text-xs sm:text-sm max-w-lg mx-auto text-secondary">
          Update reserve blood units across all 8 red blood cell compatibility groups for {profile?.name || 'Hospital'}.
        </p>
      </div>

      <Card title="Blood Bank Inventory Stock" icon={Building2} hover={false}>
        <InventoryForm initialInventory={profile?.inventory || []} onSubmit={handleUpdate} loading={saving} />
      </Card>
    </div>
  );
};

export default InventoryManagerPage;
