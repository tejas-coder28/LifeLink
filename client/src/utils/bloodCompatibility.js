/**
 * Blood Compatibility — Client-side mirror (ES Module)
 *
 * This file is an exact mirror of server/src/utils/bloodCompatibility.js.
 * Keep both in sync if the rules ever change — but rules should never
 * change without a medical review first.
 *
 * Every client component that needs blood group logic MUST import from here.
 * Do NOT define compatibility tables inline in any component.
 */

/** Canonical ordered list of the 8 ABO/Rh blood groups */
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/** Minimum safety interval (in days) required between whole blood donations */
export const DONATION_COOLDOWN_DAYS = 90;

/**
 * DONOR_CAN_GIVE_TO
 * Key  : donor blood group
 * Value: array of patient blood groups the donor can give to
 *
 *  O-    → universal donor   (can give to all 8)
 *  AB+   → universal recipient (can only give to AB+)
 */
export const DONOR_CAN_GIVE_TO = {
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
 * Derived automatically from DONOR_CAN_GIVE_TO — always in sync.
 */
export const PATIENT_CAN_RECEIVE_FROM = (() => {
  const map = {};
  for (const donorGroup of BLOOD_GROUPS) {
    for (const patientGroup of DONOR_CAN_GIVE_TO[donorGroup]) {
      if (!map[patientGroup]) map[patientGroup] = [];
      map[patientGroup].push(donorGroup);
    }
  }
  return map;
})();

/**
 * canDonate(donorGroup, patientGroup)
 * Returns true if donorGroup can donate RBC to patientGroup.
 */
export const canDonate = (donorGroup, patientGroup) => {
  if (!donorGroup || !patientGroup) return false;
  return (DONOR_CAN_GIVE_TO[donorGroup] || []).includes(patientGroup);
};

/**
 * compatibleDonorGroups(patientGroup)
 * Returns all blood groups that can donate to the given patient group.
 */
export const compatibleDonorGroups = (patientGroup) =>
  PATIENT_CAN_RECEIVE_FROM[patientGroup] || [];

/**
 * compatibleRecipientGroups(donorGroup)
 * Returns all patient blood groups a donor with donorGroup can give to.
 */
export const compatibleRecipientGroups = (donorGroup) =>
  DONOR_CAN_GIVE_TO[donorGroup] || [];
