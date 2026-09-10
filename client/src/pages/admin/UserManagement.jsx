import React, { useState, useEffect } from 'react';
import { donorApi } from '../../api/donorApi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { Users, Mail, Phone, ShieldCheck, MapPin } from 'lucide-react';

const UserManagement = () => {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await donorApi.getAllDonors();
        if (res.data && res.data.success) {
          setDonors(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch donors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <Loader text="Loading user directory..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Registered User Directory</h1>
        <p className="text-black text-sm">
          Overview of registered system users across all roles (donors, recipients, hospitals, and admins).
        </p>
      </div>

      <Card hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-black">
            <thead className="bg-lightbg/90 text-black uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Blood Group</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Standby Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {donors.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">
                    {item.user?.name || 'Registered User'}
                    <span className="block text-[10px] text-black">{item.user?.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge bloodGroup={item.bloodGroup} />
                  </td>
                  <td className="px-4 py-3 text-black">{item.contactNumber || item.user?.phone || 'N/A'}</td>
                  <td className="px-4 py-3 text-black">{item.address || 'Delhi NCR Region'}</td>
                  <td className="px-4 py-3">
                    <Badge status={item.isAvailable ? 'completed' : 'cancelled'} text={item.isAvailable ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default UserManagement;
