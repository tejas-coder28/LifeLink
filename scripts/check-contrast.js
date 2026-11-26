/**
 * Automated WCAG 2.1 Contrast Audit Script
 * Evaluates all token foreground/background pairs in Dark and Light themes.
 * Direction: "Warm Nocturne + Vital Crimson + Coral Ember" with Purposeful Accent System
 * Exits with code 1 if any ratio falls below threshold:
 *   - Normal text: >= 4.5:1 (AAA body text >= 7.0:1 where feasible)
 *   - Large text / non-text UI / icons / focus rings: >= 3.0:1
 */

function parseColor(str) {
  str = str.trim();
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = str.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgba) {
    return {
      r: parseFloat(rgba[1]),
      g: parseFloat(rgba[2]),
      b: parseFloat(rgba[3]),
      a: rgba[4] !== undefined ? parseFloat(rgba[4]) : 1,
    };
  }
  throw new Error('Unknown color format: ' + str);
}

function blend(fg, bg) {
  const fgC = typeof fg === 'string' ? parseColor(fg) : fg;
  const bgC = typeof bg === 'string' ? parseColor(bg) : bg;
  const a = fgC.a;
  return {
    r: Math.round(a * fgC.r + (1 - a) * bgC.r),
    g: Math.round(a * fgC.g + (1 - a) * bgC.g),
    b: Math.round(a * fgC.b + (1 - a) * bgC.b),
    a: 1,
  };
}

function getLuminance(color) {
  const c = typeof color === 'string' ? parseColor(color) : color;
  const srgb = [c.r / 255, c.g / 255, c.b / 255];
  const lin = srgb.map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function getContrast(fg, bg) {
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Single Source of Truth Semantic Tokens (Warm Nocturne + Vital Crimson + Coral Ember)
const THEMES = {
  Dark: {
    canvas: '#141210',
    surface: '#1D1A17',
    raised: '#27231F',
    overlay: '#312C27',
    dangerSolid: '#C81D3B',
    backgrounds: [
      { name: 'canvas', color: '#141210' },
      { name: 'surface', color: '#1D1A17' },
      { name: 'raised', color: '#27231F' },
      { name: 'overlay', color: '#312C27' },
    ],
    foregrounds: [
      { name: 'text-primary (body text)', color: '#F6F2EB', threshold: 7.0, type: 'text-aaa' },
      { name: 'text-muted (captions/labels)', color: '#ACA295', threshold: 4.5, type: 'text-aa' },
      { name: 'danger (urgent/emergency text/badge)', color: '#FF6B7B', threshold: 4.5, type: 'text-aa' },
      { name: 'success (online/verified/fulfilled)', color: '#4ADE80', threshold: 4.5, type: 'text-aa' },
      { name: 'warning (pending/cooldown/deficit)', color: '#FBBF24', threshold: 4.5, type: 'text-aa' },
      { name: 'info (links/informational/focus)', color: '#F29C79', threshold: 4.5, type: 'text-aa' },
      { name: 'ice (warm ivory accent)', color: '#F6DFC9', threshold: 4.5, type: 'text-aa' },
      // Role Accents
      { name: 'accent-donor (donor role text/dot)', color: '#34D399', threshold: 4.5, type: 'text-aa' },
      { name: 'accent-hospital (hospital role text/dot)', color: '#7DD3FC', threshold: 4.5, type: 'text-aa' },
      { name: 'accent-admin (admin role text/dot)', color: '#C4B5FD', threshold: 4.5, type: 'text-aa' },
      // Urgency Scale
      { name: 'urgency-critical (text/badge)', color: '#FF6B7B', threshold: 4.5, type: 'text-aa' },
      { name: 'urgency-high (text/badge)', color: '#FB923C', threshold: 4.5, type: 'text-aa' },
      { name: 'urgency-medium (text/badge)', color: '#FBBF24', threshold: 4.5, type: 'text-aa' },
      { name: 'urgency-low (text/badge)', color: '#7DD3FC', threshold: 4.5, type: 'text-aa' },
      // Blood Group ABO Families
      { name: 'abo-o (O family text/chip)', color: '#34D399', threshold: 4.5, type: 'text-aa' },
      { name: 'abo-a (A family text/chip)', color: '#7DD3FC', threshold: 4.5, type: 'text-aa' },
      { name: 'abo-b (B family text/chip)', color: '#C4B5FD', threshold: 4.5, type: 'text-aa' },
      { name: 'abo-ab (AB family text/chip)', color: '#FBBF24', threshold: 4.5, type: 'text-aa' },
    ],
    buttonFills: [
      { name: 'White on danger-solid (#C81D3B)', fg: '#FFFFFF', bg: '#C81D3B', threshold: 4.5 },
      { name: 'Nocturne on action-solid (#F6F2EB)', fg: '#141210', bg: '#F6F2EB', threshold: 4.5 },
      { name: 'White on success-solid (#157A3D)', fg: '#FFFFFF', bg: '#157A3D', threshold: 4.5 },
    ],
    chipPairs: [
      { name: 'accent-donor on subtle bg', fg: '#34D399', bg: blend({ ...parseColor('#34D399'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'accent-hospital on subtle bg', fg: '#7DD3FC', bg: blend({ ...parseColor('#7DD3FC'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'accent-admin on subtle bg', fg: '#C4B5FD', bg: blend({ ...parseColor('#C4B5FD'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'urgency-critical on subtle bg', fg: '#FF6B7B', bg: blend({ ...parseColor('#FF6B7B'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'urgency-high on subtle bg', fg: '#FB923C', bg: blend({ ...parseColor('#FB923C'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'urgency-medium on subtle bg', fg: '#FBBF24', bg: blend({ ...parseColor('#FBBF24'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'urgency-low on subtle bg', fg: '#7DD3FC', bg: blend({ ...parseColor('#7DD3FC'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'abo-o on subtle bg', fg: '#34D399', bg: blend({ ...parseColor('#34D399'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'abo-a on subtle bg', fg: '#7DD3FC', bg: blend({ ...parseColor('#7DD3FC'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'abo-b on subtle bg', fg: '#C4B5FD', bg: blend({ ...parseColor('#C4B5FD'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
      { name: 'abo-ab on subtle bg', fg: '#FBBF24', bg: blend({ ...parseColor('#FBBF24'), a: 0.14 }, '#1D1A17'), threshold: 4.5 },
    ],
    chartSeries: [
      { name: 'Chart series 1 (#F29C79)', color: '#F29C79', threshold: 3.0 },
      { name: 'Chart series 2 (#34D399)', color: '#34D399', threshold: 3.0 },
      { name: 'Chart series 3 (#FBBF24)', color: '#FBBF24', threshold: 3.0 },
      { name: 'Chart series 4 (#C4B5FD)', color: '#C4B5FD', threshold: 3.0 },
      { name: 'Chart series 5 (#FF6B7B)', color: '#FF6B7B', threshold: 3.0 },
      { name: 'Chart series 6 (#ACA295)', color: '#ACA295', threshold: 3.0 },
    ],
  },
  Light: {
    canvas: '#FAF7F2',
    surface: '#FFFFFF',
    raised: '#F0EBE2',
    overlay: '#FFFFFF',
    dangerSolid: '#BE123C',
    backgrounds: [
      { name: 'canvas', color: '#FAF7F2' },
      { name: 'surface', color: '#FFFFFF' },
      { name: 'raised', color: '#F0EBE2' },
      { name: 'overlay', color: '#FFFFFF' },
    ],
    foregrounds: [
      { name: 'text-primary (body text)', color: '#1C1917', threshold: 7.0, type: 'text-aaa' },
      { name: 'text-muted (captions/labels)', color: '#635A52', threshold: 4.5, type: 'text-aa' },
      { name: 'danger (urgent/emergency text/badge)', color: '#BE123C', threshold: 4.5, type: 'text-aa' },
      { name: 'success (online/verified/fulfilled)', color: '#157A3D', threshold: 4.5, type: 'text-aa' },
      { name: 'warning (pending/cooldown/deficit)', color: '#9A5B00', threshold: 4.5, type: 'text-aa' },
      { name: 'info (links/informational/focus)', color: '#B53E12', threshold: 4.5, type: 'text-aa' },
      { name: 'ice (espresso ink accent)', color: '#1C1917', threshold: 4.5, type: 'text-aa' },
      // Role Accents
      { name: 'accent-donor (donor role text/dot)', color: '#0B5E58', threshold: 4.5, type: 'text-aa' },
      { name: 'accent-hospital (hospital role text/dot)', color: '#075985', threshold: 4.5, type: 'text-aa' },
      { name: 'accent-admin (admin role text/dot)', color: '#6D28D9', threshold: 4.5, type: 'text-aa' },
      // Urgency Scale
      { name: 'urgency-critical (text/badge)', color: '#BE123C', threshold: 4.5, type: 'text-aa' },
      { name: 'urgency-high (text/badge)', color: '#A14A08', threshold: 4.5, type: 'text-aa' },
      { name: 'urgency-medium (text/badge)', color: '#9A5B00', threshold: 4.5, type: 'text-aa' },
      { name: 'urgency-low (text/badge)', color: '#0369A1', threshold: 4.5, type: 'text-aa' },
      // Blood Group ABO Families
      { name: 'abo-o (O family text/chip)', color: '#0B5E58', threshold: 4.5, type: 'text-aa' },
      { name: 'abo-a (A family text/chip)', color: '#075985', threshold: 4.5, type: 'text-aa' },
      { name: 'abo-b (B family text/chip)', color: '#6D28D9', threshold: 4.5, type: 'text-aa' },
      { name: 'abo-ab (AB family text/chip)', color: '#9A5B00', threshold: 4.5, type: 'text-aa' },
    ],
    buttonFills: [
      { name: 'White on danger-solid (#BE123C)', fg: '#FFFFFF', bg: '#BE123C', threshold: 4.5 },
      { name: 'Cream on action-solid (#1C1917)', fg: '#FAF7F2', bg: '#1C1917', threshold: 4.5 },
      { name: 'White on success-solid (#157A3D)', fg: '#FFFFFF', bg: '#157A3D', threshold: 4.5 },
    ],
    chipPairs: [
      { name: 'accent-donor on subtle bg', fg: '#0B5E58', bg: blend({ ...parseColor('#0B5E58'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'accent-hospital on subtle bg', fg: '#075985', bg: blend({ ...parseColor('#075985'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'accent-admin on subtle bg', fg: '#6D28D9', bg: blend({ ...parseColor('#6D28D9'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'urgency-critical on subtle bg', fg: '#BE123C', bg: blend({ ...parseColor('#BE123C'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'urgency-high on subtle bg', fg: '#A14A08', bg: blend({ ...parseColor('#A14A08'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'urgency-medium on subtle bg', fg: '#9A5B00', bg: blend({ ...parseColor('#9A5B00'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'urgency-low on subtle bg', fg: '#0369A1', bg: blend({ ...parseColor('#0369A1'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'abo-o on subtle bg', fg: '#0B5E58', bg: blend({ ...parseColor('#0B5E58'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'abo-a on subtle bg', fg: '#075985', bg: blend({ ...parseColor('#075985'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'abo-b on subtle bg', fg: '#6D28D9', bg: blend({ ...parseColor('#6D28D9'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
      { name: 'abo-ab on subtle bg', fg: '#9A5B00', bg: blend({ ...parseColor('#9A5B00'), a: 0.08 }, '#FFFFFF'), threshold: 4.5 },
    ],
    chartSeries: [
      { name: 'Chart series 1 (#C2410C)', color: '#C2410C', threshold: 3.0 },
      { name: 'Chart series 2 (#0F766E)', color: '#0F766E', threshold: 3.0 },
      { name: 'Chart series 3 (#A14A08)', color: '#A14A08', threshold: 3.0 },
      { name: 'Chart series 4 (#6D28D9)', color: '#6D28D9', threshold: 3.0 },
      { name: 'Chart series 5 (#BE123C)', color: '#BE123C', threshold: 3.0 },
      { name: 'Chart series 6 (#57534E)', color: '#57534E', threshold: 3.0 },
    ],
  },
};

let hasFailure = false;

console.log('='.repeat(80));
console.log('LifeLink WCAG 2.1 Contrast Audit — Warm Nocturne + Vital Crimson + Coral Ember');
console.log('='.repeat(80));

for (const [themeName, theme] of Object.entries(THEMES)) {
  console.log(`\n### ${themeName.toUpperCase()} MODE AUDIT`);
  console.log(`Canvas: ${theme.canvas} | Surface: ${theme.surface} | Raised: ${theme.raised} | Overlay: ${theme.overlay}`);
  console.log('-'.repeat(80));

  for (const fg of theme.foregrounds) {
    for (const bg of theme.backgrounds) {
      const ratio = getContrast(fg.color, bg.color);
      const passed = ratio >= fg.threshold;
      if (!passed) hasFailure = true;
      console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${fg.name.padEnd(42)} on ${bg.name.padEnd(10)}: ${ratio.toFixed(2).padStart(5)}:1 (req >= ${fg.threshold}:1)`);
    }
  }

  for (const btn of theme.buttonFills) {
    const ratio = getContrast(btn.fg, btn.bg);
    const passed = ratio >= btn.threshold;
    if (!passed) hasFailure = true;
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${btn.name.padEnd(42)} fill text : ${ratio.toFixed(2).padStart(5)}:1 (req >= ${btn.threshold}:1)`);
  }

  for (const chip of theme.chipPairs) {
    const ratio = getContrast(chip.fg, chip.bg);
    const passed = ratio >= chip.threshold;
    if (!passed) hasFailure = true;
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${chip.name.padEnd(42)} chip text : ${ratio.toFixed(2).padStart(5)}:1 (req >= ${chip.threshold}:1)`);
  }

  for (const ch of theme.chartSeries) {
    const ratio = getContrast(ch.color, theme.surface);
    const passed = ratio >= ch.threshold;
    if (!passed) hasFailure = true;
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${ch.name.padEnd(42)} chart data: ${ratio.toFixed(2).padStart(5)}:1 (req >= ${ch.threshold}:1)`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`AUDIT SUMMARY: ${hasFailure ? 'FAILED' : 'ALL TESTS PASSED'}`);
console.log('='.repeat(80));

if (hasFailure) {
  console.error('\nError: One or more contrast pairs fell below the required WCAG threshold!');
  process.exit(1);
} else {
  console.log('\nAll semantic token text, UI, button, chip, and chart series strictly pass WCAG AA guidelines.\n');
  process.exit(0);
}
