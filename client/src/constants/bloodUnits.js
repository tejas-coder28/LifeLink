/**
 * client/src/constants/bloodUnits.js
 *
 * Mirrored blood unit volume and donation pledge limits configuration.
 * Single source of truth for volume conversions and pledge quotas on the client.
 * Note: Real values should adhere to hospital protocol and National Blood Transfusion Council (NBTC) guidance.
 */

// 450 ml is standard whole-blood donation unit (~350-450 ml per NBTC / Red Cross guidelines)
export const ML_PER_UNIT = 450;

// A single volunteer donor gives 1 unit per donation session to prevent hypovolemia
export const MAX_UNITS_PER_DONOR_PER_PLEDGE = 1;

/**
 * Format unit count with approximate volume in ml or L.
 * Uses correct singular ("unit") vs plural ("units").
 *
 * Examples:
 *   formatUnits(1) -> "1 unit (≈ 450 ml)"
 *   formatUnits(2) -> "2 units (≈ 900 ml)"
 *   formatUnits(77) -> "77 units (≈ 34.7 L)"
 *   formatUnits(77, { useLitres: false }) -> "77 units (≈ 34650 ml)"
 *
 * @param {number|string} n - Number of blood units
 * @param {Object|boolean} [options={}] - Options object or boolean flag for useLitres
 * @param {boolean} [options.useLitres] - Whether to format volumes >= 1000 ml in litres (default: true when >= 1000 ml)
 * @returns {string} Formatted units string with volume
 */
export function formatUnits(n, options = {}) {
  const num = Number(n) || 0;
  const unitWord = num === 1 ? 'unit' : 'units';
  const ml = Math.round(num * ML_PER_UNIT);

  const useLitres = typeof options === 'boolean'
    ? options
    : options.useLitres !== undefined
      ? Boolean(options.useLitres)
      : ml >= 1000;

  let volStr;
  if (useLitres && ml >= 1000) {
    const litres = (Math.round((ml / 1000) * 10) / 10).toFixed(1);
    volStr = `${litres} L`;
  } else {
    volStr = `${ml} ml`;
  }

  return `${num} ${unitWord} (≈ ${volStr})`;
}

