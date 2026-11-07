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
  Edit2,
  Trash2,
  Ban,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { canDonate } from '../../utils/bloodCompatibility';
import { canSeekDonors } from '../../utils/requestRules';
import { formatUnits, formatUnitsParts } from '../../constants/bloodUnits';
import { formatStatusLabel } from '../../utils/statusHelper';

const RequestCard = ({
  request,
  donorBloodGroup,
  isDonorCard = false,
  currentStock,
  onSelect,
  onPledge,
  isPledging = false,
  isPledged = false,
  pledgedAmount,
  onViewPledge,
  pledgeText = 'Respond / Pledge',
  showActions = true,
  trackLink,
  extraAction,
  pledges,
  onConfirmDonation,
  onDeclineDonation,
  onEdit,
  onCancel,
  onDelete,
  onClose,
  isOwner = false,
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

  const elapsedMs = request.createdAt ? Date.now() - new Date(request.createdAt).getTime() : Infinity;
  const isWithinGracePeriod = elapsedMs < 5 * 60 * 1000;
  const hasPledges = pledges && pledges.length > 0;
  const canUndoDelete = isWithinGracePeriod && !hasPledges;
  const hasFulfilled = (Number(request.unitsFulfilled) || 0) > 0 || (pledges && pledges.some((p) => p.status === 'completed' || p.status === 'fulfilled'));

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
  const isTerminal =
    status === 'cancelled' ||
    status === 'closed' ||
    status === 'fulfilled' ||
    status === 'rejected' ||
    status === 'hospital_no_response';
  const seekingDonors = canSeekDonors(request);
  const isFulfilled = status === 'fulfilled';
  const donorUnitsFulfilled = Math.max(
    0,
    (request.unitsFulfilled !== undefined ? request.unitsFulfilled : totalNeeded) - fromStock
  );
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
  const requesterRaw = request.requester;
  const requesterName = (requesterRaw && typeof requesterRaw === 'object' ? requesterRaw.name : request.requesterName) || '';
  const matchedCount = request.matchedDonorsCount;
  const notes = request.notes;
  const dateStr = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString()
    : request.requiredByDate
    ? `Needed: ${new Date(request.requiredByDate).toLocaleDateString()}`
    : 'Active Broadcast';

  const isCritical = urgency === 'critical';
  const isCompatible = donorBloodGroup && request.bloodGroup
    ? canDonate(donorBloodGroup, request.bloodGroup)
    : true;

  return (
    <div
      className={`glass-card glass-card-hover flex flex-col justify-between h-full rounded-2xl overflow-hidden border transition-all duration-200 ${
        isCritical
          ? 'border-danger/40 shadow-glow-danger/30'
          : 'border-hairline'
      } ${className}`}
    >
      {/* ── 1. HEADER SECTION ──────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="shrink-0 mt-0.5">
              <Badge bloodGroup={request.bloodGroup} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-extrabold text-primary text-base leading-snug truncate">
                  {patientName}
                </h3>
                {request.isEdited && (
                  <span
                    className="text-[10px] font-bold text-muted bg-surface/80 px-2 py-0.5 rounded-md border border-hairline inline-flex items-center gap-1"
                    title={request.lastEditedAt ? `Last edited: ${new Date(request.lastEditedAt).toLocaleString()}` : 'Edited'}
                  >
                    <span>Edited</span>
                  </span>
                )}
              </div>
              {isDonorCard ? (
                <p className="text-xs font-semibold text-secondary mt-1">
                  Needed from donors: <span className={`font-black text-sm ${isCritical ? 'text-danger' : 'text-primary'}`}>{neededFromDonors}</span> unit(s)
                </p>
              ) : (
                <p className="text-xs font-semibold text-secondary mt-1">
                  Total needed: <span className="font-bold text-primary">{totalNeeded}</span> unit(s)
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 mt-0.5 flex items-center gap-1.5 flex-wrap justify-end">
            <Badge status={urgency} />
            {status && (
              <Badge status={status} />
            )}
          </div>
        </div>

        {request.status === 'cancelled' && (
          <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/25 text-xs text-danger">
            <span className="font-extrabold">Cancelled:</span> {request.cancelReasonLabel || formatStatusLabel(request.cancelReason) || 'Cancelled'}
            {request.cancelInternalNote && (
              <span className="text-[11px] block text-secondary mt-0.5 italic">"{request.cancelInternalNote}"</span>
            )}
          </div>
        )}
        {request.status === 'closed' && (
          <div className="mt-3 p-3 rounded-xl bg-surface border border-hairline text-xs text-secondary">
            <span className="font-extrabold">Closed:</span> Request closed ({request.unitsFulfilled || 0} unit(s) fulfilled).
          </div>
        )}
      </div>

      {/* FULL WIDTH DIVIDER */}
      <div className="w-full border-t border-hairline" />

      {/* ── 2. DETAILS SECTION ────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 py-4 sm:py-5 flex-1 space-y-3.5 text-xs text-secondary">
        {/* Five Unit Metrics Breakdown Box */}
        <div className="p-3 rounded-2xl bg-surface/90 border border-hairline space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-1.5 rounded-xl bg-surface border border-hairline flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted uppercase font-bold block mb-0.5">Total needed</span>
              <span className="font-black text-primary text-xs sm:text-sm block whitespace-nowrap">{formatUnitsParts(totalNeeded).unitsText}</span>
              <span className="text-[10px] text-muted block whitespace-nowrap">{formatUnitsParts(totalNeeded).volumeText}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-surface border border-hairline flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted uppercase font-bold block mb-0.5">From hospital stock</span>
              <span className="font-black text-primary text-xs sm:text-sm block whitespace-nowrap">{formatUnitsParts(fromStock).unitsText}</span>
              <span className="text-[10px] text-muted block whitespace-nowrap">{formatUnitsParts(fromStock).volumeText}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-surface border border-hairline flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted uppercase font-bold block mb-0.5">Needed from donors</span>
              <span className={`font-black text-xs sm:text-sm block whitespace-nowrap ${isCritical ? 'text-danger' : 'text-primary'}`}>{formatUnitsParts(neededFromDonors).unitsText}</span>
              <span className="text-[10px] text-muted block whitespace-nowrap">{formatUnitsParts(neededFromDonors).volumeText}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-surface border border-hairline flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted uppercase font-bold block mb-0.5">Pledged</span>
              <span className="font-black text-info text-xs sm:text-sm block whitespace-nowrap">{formatUnitsParts(pledgedUnits).unitsText}</span>
              <span className="text-[10px] text-muted block whitespace-nowrap">{formatUnitsParts(pledgedUnits).volumeText}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-surface border border-hairline flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted uppercase font-bold block mb-0.5">Received</span>
              <span className="font-black text-success text-xs sm:text-sm block whitespace-nowrap">{formatUnitsParts(receivedUnits).unitsText}</span>
              <span className="text-[10px] text-muted block whitespace-nowrap">{formatUnitsParts(receivedUnits).volumeText}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-surface border border-hairline h-2 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${pctReceived}%` }}
                className="bg-success h-full transition-all"
                title={`Received: ${receivedUnits}/${totalNeeded}`}
              />
              <div
                style={{ width: `${pctPledged}%` }}
                className="bg-info h-full transition-all"
                title={`Pledged: ${pledgedUnits}/${totalNeeded}`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted font-medium flex-wrap gap-x-2 gap-y-0.5">
              <span className="whitespace-nowrap">{pctReceived}% Received</span>
              {pledgedUnits > 0 && <span className="text-info font-bold whitespace-nowrap">+{formatUnits(pledgedUnits)} Pledged</span>}
              <span className="whitespace-nowrap font-medium">Target: {formatUnits(totalNeeded)}</span>
            </div>
          </div>

          {/* Current Hospital Inventory Stock */}
          {currentStock !== undefined && (
            <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px]">
              <span className="text-secondary font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-info" />
                Current stock ({request.bloodGroup}):
              </span>
              <span className="font-black text-primary px-2 py-0.5 rounded-lg bg-surface border border-hairline">
                {formatUnits(currentStock)} available in inventory
              </span>
            </div>
          )}
        </div>

        {hospital && (
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 shrink-0 text-muted" />
            <span className="truncate font-medium">{hospital}</span>
          </div>
        )}

        {address && (
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <MapPin className="w-4 h-4 shrink-0 text-muted" />
              <span className="truncate">{address}</span>
            </div>
            {isPledged && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || hospital)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-info hover:underline shrink-0"
              >
                <Navigation className="w-3 h-3" />
                <span>Get Directions</span>
              </a>
            )}
          </div>
        )}

        {isPledged && hospitalPhone && (
          <div className="flex items-center gap-2.5 text-primary font-mono text-xs">
            <Phone className="w-4 h-4 shrink-0 text-info" />
            <span>Hospital Contact: <strong>{hospitalPhone}</strong></span>
          </div>
        )}

        {isPledged && (
          <div className="p-3 rounded-xl bg-surface border border-hairline space-y-1 text-[11px] text-secondary">
            <span className="font-extrabold text-primary uppercase text-[10px] tracking-wider block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success" /> Pre-Donation Checklist:
            </span>
            <p className="text-muted">✓ Bring official Government / Photo ID</p>
            <p className="text-muted">✓ Eat a healthy meal &amp; hydrate with 500ml water</p>
            <p className="text-muted">✓ 18+ years, 50kg+, feeling healthy &amp; well-rested</p>
          </div>
        )}

        {requesterName && (
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 shrink-0 text-muted" />
            <span className="truncate">
              Requester: <strong className="text-primary">{requesterName}</strong>
            </span>
          </div>
        )}

        {seekingDonors && matchedCount !== undefined && matchedCount !== null && (
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 shrink-0 text-info" />
            <span>
              Matched Donors: <strong className="text-primary">{matchedCount} candidate(s)</strong>
            </span>
          </div>
        )}

        {isFulfilled && (
          <div className="p-3 rounded-xl bg-surface border border-hairline text-primary font-semibold text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-success" />
            <span>
              Fulfilled: {fromStock} units from hospital stock, {donorUnitsFulfilled} units from donors
            </span>
          </div>
        )}

        {notes && (
          <p className="text-[11px] italic p-2.5 rounded-xl bg-surface border border-hairline text-secondary mt-2 line-clamp-2">
            "{notes}"
          </p>
        )}

        {/* ── Pledged Donors Section ── */}
        {pledges && pledges.length > 0 && (
          <div className="mt-4 pt-3 border-t border-hairline space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-danger fill-danger/20" />
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
                    className="p-3 rounded-xl bg-surface border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge bloodGroup={donorBlood} />
                        <span className="font-extrabold text-xs text-primary truncate">{donorName}</span>
                        <Badge status={p.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted flex-wrap">
                        <span>{formatUnits(p.unitsDonated || 1)}</span>
                        <span>•</span>
                        <span>{pledgedTime}</span>
                        {!isDonorCard && Boolean(onConfirmDonation) && p.donor?.phone && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium">{p.donor.phone}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {p.status === 'pledged' && (
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline">
                        <button
                          type="button"
                          disabled={Boolean(actionInProgressId)}
                          onClick={() => onConfirmDonation && onConfirmDonation(p._id, request._id)}
                          className="px-3 py-1.5 rounded-lg bg-success hover:opacity-90 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Confirm donation of ${formatUnits(p.unitsDonated || 1)} from ${donorName}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isActionLoading ? 'Saving...' : 'Confirm Donation'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionInProgressId)}
                          onClick={() => onDeclineDonation && onDeclineDonation(p._id, request._id)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface text-secondary hover:text-primary border border-hairline font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Decline or report no-show for ${donorName}`}
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
        <div className="w-full border-t border-hairline" />
      )}

      {/* ── 3. FOOTER SECTION ────────────────────────────────────────────── */}
      {showActions && (
        <div className="p-5 sm:p-6 pt-4 sm:pt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(request)}
                className="text-xs font-bold text-secondary hover:text-primary transition-colors cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info rounded px-1"
                aria-label={`View details for ${request.patientName || 'blood request'}`}
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : trackLink ? (
              <Link
                to={trackLink}
                className="text-xs font-bold text-info hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info rounded px-1"
                aria-label={`Track status for ${request.patientName || 'blood request'}`}
              >
                <span>Track Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to={`/individual/track/${request._id || request.id}`}
                className="text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info rounded px-1"
                aria-label={`View details for ${request.patientName || 'blood request'}`}
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}

            {isOwner && !isTerminal && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {onEdit && (
                  <button
                    type="button"
                    disabled={Boolean(actionInProgressId)}
                    onClick={() => onEdit(request)}
                    className="px-2.5 py-1.5 rounded-xl border border-hairline bg-surface hover:text-primary text-secondary text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    aria-label={`Edit ${patientName}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}

                {canUndoDelete && onDelete ? (
                  <button
                    type="button"
                    disabled={Boolean(actionInProgressId)}
                    onClick={() => onDelete(request)}
                    className="px-2.5 py-1.5 rounded-xl border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    aria-label={`Delete ${patientName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete request</span>
                  </button>
                ) : hasFulfilled && onClose ? (
                  <button
                    type="button"
                    disabled={Boolean(actionInProgressId)}
                    onClick={() => onClose(request)}
                    className="px-2.5 py-1.5 rounded-xl border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    aria-label={`Close ${patientName}`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Close request</span>
                  </button>
                ) : onCancel ? (
                  <button
                    type="button"
                    disabled={Boolean(actionInProgressId)}
                    onClick={() => onCancel(request)}
                    className="px-2.5 py-1.5 rounded-xl border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    aria-label={`Cancel ${patientName}`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel request</span>
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {extraAction}

            {isPledged ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 bg-surface text-success border border-hairline font-extrabold shadow-none">
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span>Pledged: {formatUnits(pledgedAmount || 1)}</span>
                </span>
                {onViewPledge && (
                  <button
                    type="button"
                    onClick={onViewPledge}
                    className="btn-secondary text-xs px-3 py-2 rounded-xl cursor-pointer shrink-0"
                  >
                    View Pledge
                  </button>
                )}
              </div>
            ) : onPledge ? (
              <button
                type="button"
                onClick={() => isCompatible && onPledge(request._id || request.id)}
                disabled={isPledging || !isCompatible}
                title={!isCompatible ? `Your blood group (${donorBloodGroup}) is not compatible with ${request.bloodGroup}` : ''}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all ${
                  !isCompatible
                    ? 'bg-surface text-muted cursor-not-allowed border border-hairline shadow-none'
                    : 'btn-primary'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${!isCompatible ? 'text-muted' : 'fill-white'}`} />
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
