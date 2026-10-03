import React from 'react';
import Badge from '../common/Badge';
import {
  MapPin,
  Calendar,
  Hospital,
  Heart,
  Users,
  ArrowRight,
  ChevronRight,
  Clock,
  Cpu
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { canDonate } from '../../utils/bloodCompatibility';

const RequestCard = ({
  request,
  donorBloodGroup,
  onSelect,
  onPledge,
  isPledging = false,
  pledgeText = 'Respond / Pledge',
  showActions = true,
  trackLink,
  extraAction,
  className = '',
}) => {
  if (!request) return null;

  const patientName = request.patientName || request.recipientName || 'Emergency Blood Patient';
  const units = request.unitsNeeded || request.unitsRequired || request.units || 1;
  const urgency = request.urgencyLevel || request.urgency || 'medium';
  const status = request.status || 'open';
  // hospital may be a populated object {_id, name, address, phone} or a plain string id or missing
  const hospitalRaw = request.hospital;
  const hospital = request.hospitalName
    || (hospitalRaw && typeof hospitalRaw === 'object' ? hospitalRaw.name : (hospitalRaw || ''));
  const address = request.address || request.city
    || (hospitalRaw && typeof hospitalRaw === 'object' ? hospitalRaw.address : '')
    || '';
  // requester may be a populated object or missing
  const requesterRaw = request.requester;
  const requesterName = (requesterRaw && typeof requesterRaw === 'object' ? requesterRaw.name : request.requesterName) || '';
  const matchedCount = request.matchedDonorsCount;
  const notes = request.notes;
  const dateStr = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString()
    : request.requiredByDate
    ? `Needed: ${new Date(request.requiredByDate).toLocaleDateString()}`
    : 'Active Broadcast';

  const isCompatible = donorBloodGroup ? canDonate(donorBloodGroup, request.bloodGroup) : true;

  return (
    <div
      className={`glass-card glass-card-hover flex flex-col justify-between h-full rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 transition-all duration-200 ${className}`}
    >
      {/* ── 1. HEADER SECTION ──────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          {/* Blood group chip on left, patient name + required units beside it with gap-3 */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="shrink-0 mt-0.5">
              <Badge bloodGroup={request.bloodGroup} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-extrabold text-primary text-base leading-snug truncate">
                {patientName}
              </h3>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                {units} unit(s) required
              </p>
            </div>
          </div>

          {/* Urgency badge pinned top-right on the same line */}
          <div className="shrink-0 mt-0.5 flex items-center gap-1.5">
            <Badge status={urgency} />
            {status && status !== 'open' && (
              <Badge status={status} />
            )}
          </div>
        </div>
      </div>

      {/* FULL WIDTH DIVIDER */}
      <div className="w-full border-t border-slate-200/80 dark:border-white/10" />

      {/* ── 2. DETAILS SECTION ────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 py-4 sm:py-5 flex-1 space-y-2.5 text-xs text-secondary">
        {hospital && (
          <div className="flex items-center gap-2.5">
            <Hospital className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
            <span className="truncate font-medium">{hospital}</span>
          </div>
        )}

        {address && (
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" />
            <span className="truncate">{address}</span>
          </div>
        )}

        {requesterName && (
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
            <span className="truncate">
              Requester: <strong className="text-primary">{requesterName}</strong>
            </span>
          </div>
        )}

        {matchedCount !== undefined && matchedCount !== null && (
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <span>
              Matched Donors: <strong className="text-primary">{matchedCount} candidate(s)</strong>
            </span>
          </div>
        )}

        {notes && (
          <p className="text-[11px] italic p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-secondary mt-2 line-clamp-2">
            "{notes}"
          </p>
        )}
      </div>

      {/* FULL WIDTH DIVIDER */}
      {showActions && (
        <div className="w-full border-t border-slate-200/80 dark:border-white/10" />
      )}

      {/* ── 3. FOOTER SECTION ────────────────────────────────────────────── */}
      {showActions && (
        <div className="p-5 sm:p-6 pt-4 sm:pt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left: View Details or Date info or Track link */}
          <div className="flex items-center gap-2">
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(request)}
                className="text-xs font-bold text-secondary hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : trackLink ? (
              <Link
                to={trackLink}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <span>Track Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="text-[11px] font-medium text-muted flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted" />
                {dateStr}
              </span>
            )}
          </div>

          {/* Right Action Button (stack / full width on small screens) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {extraAction}

            {onPledge && (
              <button
                type="button"
                onClick={() => isCompatible && onPledge(request._id || request.id)}
                disabled={isPledging || !isCompatible}
                title={!isCompatible ? `Your blood group (${donorBloodGroup}) is not compatible with ${request.bloodGroup}` : ''}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all ${
                  !isCompatible
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-white/10 shadow-none'
                    : 'btn-primary'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${!isCompatible ? 'text-slate-400 dark:text-slate-500' : 'fill-white'}`} />
                <span>
                  {isPledging
                    ? 'Pledging...'
                    : !isCompatible
                    ? 'Not compatible with your blood group'
                    : pledgeText}
                </span>
              </button>
            )}

            {!onPledge && !extraAction && !onSelect && !trackLink && (
              <Link
                to={`/emergency-request`}
                className="btn-secondary w-full sm:w-auto px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <span>Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestCard;
