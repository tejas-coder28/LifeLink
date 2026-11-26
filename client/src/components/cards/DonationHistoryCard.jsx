import React from 'react';
import Badge from '../common/Badge';
import { formatUnits } from '../../constants/bloodUnits';
import { formatDate } from '../../utils/dateFormatter';
import { computeNextEligibleDate } from '../../utils/eligibility';
import { Building2, MapPin, Calendar } from 'lucide-react';

/**
 * Resolves consistent display dates and copy for donor donation/pledge history items.
 */
export function getDonationHistoryDisplay(item) {
  const status = (item?.status || '').toString().toLowerCase().trim();
  const pledgedAt = item?.pledgedAt || item?.createdAt || null;
  const isCompleted = status === 'completed' || status === 'fulfilled';
  const isReleasedOrDeclined = ['released', 'cancelled', 'rejected'].includes(status);

  const donatedAt = isCompleted
    ? (item?.donatedAt || item?.confirmedAt || item?.completedAt || item?.fulfilledAt || item?.donationDate || null)
    : null;
  const releasedAt = isReleasedOrDeclined
    ? (item?.releasedAt || item?.cancelledAt || item?.updatedAt || pledgedAt)
    : null;

  const nextEligibleDate = isCompleted && donatedAt ? computeNextEligibleDate(donatedAt) : null;

  let summaryLine = `Pledged on ${formatDate(pledgedAt)}`;
  if (status === 'pledged') {
    summaryLine = `Pledged on ${formatDate(pledgedAt)} - awaiting hospital confirmation`;
  } else if (isCompleted) {
    summaryLine = `Pledged on ${formatDate(pledgedAt)} - Donated on ${formatDate(donatedAt)}`;
  } else if (isReleasedOrDeclined) {
    summaryLine = `Pledged on ${formatDate(pledgedAt)} - Released on ${formatDate(releasedAt)}`;
  }

  const rightDateLabel = isCompleted ? 'Donated:' : 'Pledged:';
  const rightDateValue = isCompleted ? formatDate(donatedAt) : formatDate(pledgedAt);

  return {
    isCompleted,
    isReleasedOrDeclined,
    pledgedAt,
    donatedAt,
    releasedAt,
    nextEligibleDate,
    summaryLine,
    rightDateLabel,
    rightDateValue,
  };
}

/**
 * Shared Donor History Card used across DonorDashboard, DonationHistory, and IndividualDashboard.
 */
const DonationHistoryCard = ({ item, cancellingPledgeId = null, onCancelPledge = null }) => {
  const {
    isCompleted,
    nextEligibleDate,
    summaryLine,
    rightDateLabel,
    rightDateValue,
  } = getDonationHistoryDisplay(item);

  const hospitalName =
    item.hospitalName ||
    item.request?.targetHospital?.name ||
    item.hospital?.name ||
    item.request?.hospitalName ||
    'Hospital unavailable';

  return (
    <div
      key={item._id}
      className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-hairline hover:border-info/40 transition-all duration-200 shadow-card"
    >
      <div className="space-y-3 flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2.5">
          <Badge bloodGroup={item.request?.bloodGroup || 'O+'} />
          <h4 className="text-base font-bold text-primary font-heading truncate">
            {item.request?.patientName ? `Donation for ${item.request.patientName}` : 'Emergency Blood Request'}
          </h4>
          <Badge status={item.status} />
        </div>

        <div className="text-xs space-y-1.5 text-secondary">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 shrink-0 text-muted" />
            <span className="truncate font-semibold text-primary">{hospitalName}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0 text-muted" />
            <span className="truncate">{item.request?.address || 'Medical Facility'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0 text-muted" />
            <span className="font-mono text-[11px] text-primary">{summaryLine}</span>
          </div>

          {nextEligibleDate && (
            <div className="text-[11px] font-semibold text-info pt-0.5">
              Next eligible: {formatDate(nextEligibleDate)}
            </div>
          )}
        </div>
      </div>

      <div className="sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-hairline w-full sm:w-auto flex flex-col items-end gap-2">
        <div
          className={`w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end px-4 py-2.5 rounded-xl border ${
            isCompleted
              ? 'bg-success/10 border-success/20'
              : 'bg-surface border-hairline'
          }`}
        >
          <span className={`text-sm font-black block tracking-tight ${isCompleted ? 'text-success' : 'text-primary'}`}>
            {formatUnits(item.unitsDonated || 1)}
          </span>
          <span className="text-[11px] text-secondary font-medium block mt-0.5">
            {rightDateLabel} {rightDateValue}
          </span>
        </div>

        {item.status === 'pledged' && onCancelPledge && (
          <button
            type="button"
            disabled={cancellingPledgeId === item._id}
            onClick={() => onCancelPledge(item._id)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer text-center"
          >
            {cancellingPledgeId === item._id ? 'Cancelling...' : 'Cancel Pledge'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DonationHistoryCard;
