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
  Cpu,
  Check,
  XCircle,
  Building2,
  Navigation,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { canDonate } from '../../utils/bloodCompatibility';
import { canSeekDonors } from '../../utils/requestRules';

const RequestCard = ({
  request,
  donorBloodGroup,
  isDonorCard = false,
  currentStock,
  onSelect,
  onPledge,
  isPledging = false,
  isPledged = false,
  pledgeText = 'Respond / Pledge',
  showActions = true,
  trackLink,
  extraAction,
  pledges,
  onConfirmDonation,
  onDeclineDonation,
  actionInProgressId,
  className = '',
}) => {
  if (!request) return null;

  const totalNeeded = request.unitsNeeded || request.unitsRequired || request.units || 1;
  const fromStock = request.unitsFromStock || 0;
  const neededFromDonors = request.unitsFromDonors !== undefined && request.unitsFromDonors !== null && request.unitsFromDonors > 0
    ? request.unitsFromDonors
    : request.status === 'pending_hospital_review'
    ? 0
    : Math.max(0, totalNeeded - fromStock);

  // If this is a donor card and needed from donors is 0, hide the card
  if (isDonorCard && neededFromDonors <= 0) {
    return null;
  }

  const pledgedUnits = pledges && pledges.length > 0
    ? pledges.filter((p) => p.status === 'pledged').reduce((sum, p) => sum + (p.unitsDonated || 1), 0)
    : (request.pledgedUnits || 0);

  const receivedUnits = request.unitsFulfilled !== undefined
    ? request.unitsFulfilled
    : pledges && pledges.length > 0
    ? pledges.filter((p) => p.status === 'completed').reduce((sum, p) => sum + (p.unitsDonated || 1), 0)
    : 0;

  const pctReceived = Math.min(100, Math.round((receivedUnits / (totalNeeded || 1)) * 100));
  const pctPledged = Math.min(100 - pctReceived, Math.round((pledgedUnits / (totalNeeded || 1)) * 100));

  const patientName = request.patientName || request.recipientName || 'Emergency Blood Patient';
  const urgency = request.urgencyLevel || request.urgency || 'medium';
  const status = request.status || 'open';
  const seekingDonors = canSeekDonors(request);
  const isFulfilled = status === 'fulfilled';
  const donorUnitsFulfilled = Math.max(
    0,
    (request.unitsFulfilled !== undefined ? request.unitsFulfilled : totalNeeded) - fromStock
  );
  // hospital may be a populated object {_id, name, address, phone} or a plain string id or missing
  const targetHosp = request.targetHospital || (request.hospital && typeof request.hospital === 'object' ? request.hospital : null);
  const hospitalRaw = request.hospital;
  const hospital = request.hospitalName
    || (targetHosp ? targetHosp.name : '')
    || (hospitalRaw && typeof hospitalRaw === 'object' ? hospitalRaw.name : (hospitalRaw || ''));
  const address = request.address || request.city
    || (targetHosp ? targetHosp.address : '')
    || (hospitalRaw && typeof hospitalRaw === 'object' ? hospitalRaw.address : '')
    || '';
  const hospitalPhone = targetHosp?.phone || (hospitalRaw && typeof hospitalRaw === 'object' ? hospitalRaw.phone : '') || '';
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
              {isDonorCard ? (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                  Needed from donors: <span className="font-black text-sm">{neededFromDonors}</span> unit(s)
                </p>
              ) : (
                <p className="text-xs font-semibold text-secondary mt-1">
                  Total needed: <span className="font-bold text-primary">{totalNeeded}</span> unit(s)
                </p>
              )}
            </div>
          </div>

          {/* Urgency badge pinned top-right on the same line */}
          <div className="shrink-0 mt-0.5 flex items-center gap-1.5">
            <Badge status={urgency} />
            {status && (
              <Badge status={status} />
            )}
          </div>
        </div>
      </div>

      {/* FULL WIDTH DIVIDER */}
      <div className="w-full border-t border-slate-200/80 dark:border-white/10" />

      {/* ── 2. DETAILS SECTION ────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 py-4 sm:py-5 flex-1 space-y-3.5 text-xs text-secondary">
        {/* Five Unit Metrics Breakdown Box */}
        <div className="p-3 rounded-2xl bg-surface/90 border border-slate-200/80 dark:border-white/10 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5">
              <span className="text-[10px] text-muted uppercase font-bold block">Total needed</span>
              <span className="font-black text-primary text-sm">{totalNeeded}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5">
              <span className="text-[10px] text-muted uppercase font-bold block">From hospital stock</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{fromStock}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5">
              <span className="text-[10px] text-muted uppercase font-bold block">Needed from donors</span>
              <span className="font-black text-sky-600 dark:text-sky-400 text-sm">{neededFromDonors}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5">
              <span className="text-[10px] text-muted uppercase font-bold block">Pledged</span>
              <span className="font-black text-amber-600 dark:text-amber-400 text-sm">{pledgedUnits}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5">
              <span className="text-[10px] text-muted uppercase font-bold block">Received</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{receivedUnits}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${pctReceived}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Received: ${receivedUnits}/${totalNeeded}`}
              />
              <div
                style={{ width: `${pctPledged}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`Pledged: ${pledgedUnits}/${totalNeeded}`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted font-medium">
              <span>{pctReceived}% Received</span>
              {pledgedUnits > 0 && <span className="text-amber-600 dark:text-amber-400 font-bold">+{pledgedUnits} Pledged</span>}
              <span>Target: {totalNeeded} unit(s)</span>
            </div>
          </div>

          {/* Current Hospital Inventory Stock (shown on hospital dashboard cards) */}
          {currentStock !== undefined && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-secondary font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-rose-500" />
                Current stock ({request.bloodGroup}):
              </span>
              <span className="font-black text-primary px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-white/10">
                {currentStock} available in inventory
              </span>
            </div>
          )}
        </div>

        {hospital && (
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
            <span className="truncate font-medium">{hospital}</span>
          </div>
        )}

        {address && (
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <MapPin className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" />
              <span className="truncate">{address}</span>
            </div>
            {isPledged && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || hospital)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
              >
                <Navigation className="w-3 h-3" />
                <span>Get Directions</span>
              </a>
            )}
          </div>
        )}

        {/* Hospital phone shown ONLY after pledging */}
        {isPledged && hospitalPhone && (
          <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400 font-mono text-xs">
            <Phone className="w-4 h-4 shrink-0" />
            <span>Hospital Contact: <strong>{hospitalPhone}</strong></span>
          </div>
        )}

        {/* Donor checklist shown after pledging */}
        {isPledged && (
          <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-1 text-[11px] text-secondary">
            <span className="font-extrabold text-primary uppercase text-[10px] tracking-wider block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Pre-Donation Checklist:
            </span>
            <p className="text-muted">✓ Bring official Government / Photo ID</p>
            <p className="text-muted">✓ Eat a healthy meal &amp; hydrate with 500ml water</p>
            <p className="text-muted">✓ 18+ years, 50kg+, feeling healthy &amp; well-rested</p>
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

        {seekingDonors && matchedCount !== undefined && matchedCount !== null && (
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <span>
              Matched Donors: <strong className="text-primary">{matchedCount} candidate(s)</strong>
            </span>
          </div>
        )}

        {isFulfilled && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              Fulfilled: {fromStock} units from hospital stock, {donorUnitsFulfilled} units from donors
            </span>
          </div>
        )}

        {notes && (
          <p className="text-[11px] italic p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-secondary mt-2 line-clamp-2">
            "{notes}"
          </p>
        )}


        {/* ── Pledged Donors Section ── */}
        {pledges && pledges.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                <span>Pledged Donors ({pledges.length})</span>
              </span>
              {request.unitsFulfilled !== undefined && (
                <span className="text-[10px] font-bold text-secondary">
                  {request.unitsFulfilled || 0} / {totalNeeded} units fulfilled
                </span>
              )}
            </div>

            <div className="space-y-2">
              {pledges.map((p) => {
                const donorName = p.donor?.name || 'Anonymous Donor';
                const donorBlood = p.donorProfile?.bloodGroup || p.donor?.bloodGroup || request.bloodGroup;
                const pledgedTime = p.createdAt
                  ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date(p.createdAt).toLocaleDateString()
                  : '';
                const isActionLoading = actionInProgressId === p._id;

                return (
                  <div
                    key={p._id}
                    className="p-3 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge bloodGroup={donorBlood} />
                        <span className="font-extrabold text-xs text-primary truncate">{donorName}</span>
                        <Badge status={p.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted flex-wrap">
                        <span>{p.unitsDonated || 1} unit(s)</span>
                        <span>•</span>
                        <span>{pledgedTime}</span>
                        {p.donor?.phone && (
                          <>
                            <span>•</span>
                            <span className="text-teal-600 dark:text-teal-400 font-medium">{p.donor.phone}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons for Pledged status */}
                    {p.status === 'pledged' && (
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-white/5">
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => onConfirmDonation && onConfirmDonation(p._id, request._id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isActionLoading ? 'Saving...' : 'Confirm Donation'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => onDeclineDonation && onDeclineDonation(p._id, request._id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline / No-show</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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

            {isPledged ? (
              <button
                type="button"
                disabled
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default font-extrabold shadow-none"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Pledged ✓</span>
              </button>
            ) : onPledge ? (
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
            ) : null}


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
