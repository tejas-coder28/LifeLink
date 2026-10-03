/**
 * Blood Compatibility — Single Source of Truth (server)
 *
 * Red Blood Cell (RBC) transfusion compatibility rules.
 * Every other file on the server MUST import from here and nowhere else.
 *
 * Rule direction: "donor → patient" (who can give to whom).
 *
 *  Donor | Can donate to
 *  ------+--------------------------------------------------
 *  O-    | O-, O+, A-, A+, B-, B+, AB-, AB+  (universal)
 *  O+    | O+, A+, B+, AB+
 *  A-    | A-, A+, AB-, AB+
 *  A+    | A+, AB+
 *  B-    | B-, B+, AB-, AB+
 *  B+    | B+, AB+
 *  AB-   | AB-, AB+
 *  AB+   | AB+                               (universal recipient)
 */

/** Canonical ordered list of the 8 ABO/Rh blood groups */
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/** Minimum safety interval (in days) required between whole blood donations */
const DONATION_COOLDOWN_DAYS = 90;

/**
 * DONOR_CAN_GIVE_TO
 * Key  : donor blood group
 * Value: array of patient blood groups the donor can give to
 */
const DONOR_CAN_GIVE_TO = {
  'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+':  ['O+', 'A+', 'B+', 'AB+'],
  'A-':  ['A-', 'A+', 'AB-', 'AB+'],
  'A+':  ['A+', 'AB+'],
  'B-':  ['B-', 'B+', 'AB-', 'AB+'],
  'B+':  ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

/**
 * PATIENT_CAN_RECEIVE_FROM
 * Derived automatically from DONOR_CAN_GIVE_TO so the two are always in sync.
 * Key  : patient blood group
 * Value: array of donor blood groups the patient can receive from
 */
const PATIENT_CAN_RECEIVE_FROM = {};
for (const donorGroup of BLOOD_GROUPS) {
  for (const patientGroup of DONOR_CAN_GIVE_TO[donorGroup]) {
    if (!PATIENT_CAN_RECEIVE_FROM[patientGroup]) {
      PATIENT_CAN_RECEIVE_FROM[patientGroup] = [];
    }
    PATIENT_CAN_RECEIVE_FROM[patientGroup].push(donorGroup);
  }
}

/**
 * canDonate(donorGroup, patientGroup)
 * Returns true if donorGroup can donate RBC to patientGroup.
 */
const canDonate = (donorGroup, patientGroup) => {
  if (!donorGroup || !patientGroup) return false;
  return (DONOR_CAN_GIVE_TO[donorGroup] || []).includes(patientGroup);
};

/**
 * compatibleDonorGroups(patientGroup)
 * Returns the list of blood groups that can donate to the given patient group.
 */
const compatibleDonorGroups = (patientGroup) => {
  return PATIENT_CAN_RECEIVE_FROM[patientGroup] || [];
};

/**
 * compatibleRecipientGroups(donorGroup)
 * Returns the list of blood groups a donor with the given group can donate to.
 */
const compatibleRecipientGroups = (donorGroup) => {
  return DONOR_CAN_GIVE_TO[donorGroup] || [];
};

// ── Legacy aliases kept so existing callers don't break ──────────────────────
const isBloodCompatible     = canDonate;                       // (donorGroup, patientGroup)
const getCompatibleDonorGroups = compatibleDonorGroups;        // (patientGroup)

module.exports = {
  BLOOD_GROUPS,
  DONATION_COOLDOWN_DAYS,
  DONOR_CAN_GIVE_TO,
  PATIENT_CAN_RECEIVE_FROM,
  canDonate,
  compatibleDonorGroups,
  compatibleRecipientGroups,
  // legacy
  isBloodCompatible,
  getCompatibleDonorGroups,
};
