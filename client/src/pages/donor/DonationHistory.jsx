import React, { useState, useEffect } from 'react';
import PageTransition from '../../components/common/PageTransition';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { Heart, Calendar, MapPin, Loader2 } from 'lucide-react';
import { requestApi } from '../../api/requestApi';

const DonationHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await requestApi.getDonationHistory();
        if (res.data?.success) {
          setHistory(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch donation history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <PageTransition className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading">
          Donation History
        </h1>
        <p className="text-xs text-secondary mt-1">
          Review your completed and pledged blood donation contributions.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-info">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No Past Donations Recorded"
          description="You haven't pledged or completed any blood donations yet."
        />
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item._id}
              className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-hairline hover:border-info/40 transition-all duration-200 shadow-card"
            >
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2.5">
                  <Badge bloodGroup={item.request?.bloodGroup || 'O+'} />
                  <h3 className="text-base font-bold text-primary font-heading truncate">
                    {item.request?.patientName ? `Donation for ${item.request.patientName}` : 'Emergency Blood Request'}
                  </h3>
                  <Badge status={item.status} />
                </div>
                <div className="text-xs space-y-1.5 text-secondary">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0 text-muted" />
                    <span className="truncate">{item.request?.address || 'Medical Facility'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0 text-muted" />
                    <span className="font-mono text-[11px]">Pledged on: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-hairline w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end bg-success/10 px-4 py-2.5 rounded-xl border border-success/20">
                <span className="text-base font-black text-success block tracking-tight">
                  {item.unitsDonated} Unit(s)
                </span>
                <span className="text-[11px] text-muted block font-mono mt-0.5">
                  ID: {item._id.slice(-6)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
};

export default DonationHistoryPage;
