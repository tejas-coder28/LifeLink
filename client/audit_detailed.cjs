const fs = require('fs');
const path = require('path');

const clientSrc = path.join(__dirname, 'src');

function scanDir(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    if (fs.statSync(p).isDirectory()) {
      files = files.concat(scanDir(p));
    } else if (p.endsWith('.jsx') || p.endsWith('.js') || p.endsWith('.html') || p.endsWith('.css')) {
      files.push(p);
    }
  }
  return files;
}

const allFiles = scanDir(clientSrc);

const report = {};
let grandTotal = 0;
const categoryTotals = {
  textWhite: 0,
  textLightSlate: 0,
  textOtherSlate: 0,
  bgWhiteOpacity: 0,
  borderWhite: 0,
  bgHex: 0,
  inlineColorStyles: 0,
  headerHeroCards: 0,
  gradientTextIssues: 0,
};

allFiles.forEach((fp) => {
  const content = fs.readFileSync(fp, 'utf8');
  const rel = path.relative(__dirname, fp).replace(/\\/g, '/');

  const textWhite = (content.match(/\btext-white\b/g) || []).length;
  const textLightSlate = (content.match(/\btext-(slate|gray|zinc|neutral)-(100|200|300|400)\b/g) || []).length;
  const textOtherSlate = (content.match(/\btext-(slate|gray|zinc|neutral)-(500|600|700|800|900)\b/g) || []).length;
  const bgWhiteOpacity = (content.match(/\bbg-white\/[0-9.]+\b/g) || []).length;
  const borderWhite = (content.match(/\bborder-white\/[0-9.]+\b/g) || []).length;
  const bgHex = (content.match(/\bbg-\[#[0-9a-fA-F]+\]/g) || []).length;
  const inlineColorStyles = (content.match(/style=\{\{[^}]*?(color|background|backgroundColor|borderColor)\s*:[^}]*?\}\}/g) || []).length;
  const headerHeroCards = (content.match(/background:\s*['"]linear-gradient\(135deg,\s*(rgba\(15,23,42|rgba\(30, 15, 25|#0F1729)/g) || []).length;
  const gradientTextIssues = (content.match(/(from-white|to-white|via-white|gradient-text-brand)/g) || []).length;

  const total = textWhite + textLightSlate + textOtherSlate + bgWhiteOpacity + borderWhite + bgHex + inlineColorStyles;

  if (total > 0) {
    report[rel] = {
      textWhite,
      textLightSlate,
      textOtherSlate,
      bgWhiteOpacity,
      borderWhite,
      bgHex,
      inlineColorStyles,
      headerHeroCards,
      gradientTextIssues,
      total,
    };

    grandTotal += total;
    categoryTotals.textWhite += textWhite;
    categoryTotals.textLightSlate += textLightSlate;
    categoryTotals.textOtherSlate += textOtherSlate;
    categoryTotals.bgWhiteOpacity += bgWhiteOpacity;
    categoryTotals.borderWhite += borderWhite;
    categoryTotals.bgHex += bgHex;
    categoryTotals.inlineColorStyles += inlineColorStyles;
    categoryTotals.headerHeroCards += headerHeroCards;
    categoryTotals.gradientTextIssues += gradientTextIssues;
  }
});

const sorted = Object.entries(report).sort((a, b) => b[1].total - a[1].total);

console.log('========================================================================');
console.log('  LIFELINK LIGHT MODE COMPREHENSIVE COLOR AUDIT');
console.log('========================================================================\n');

console.log('CATEGORY TOTALS:');
console.log(`- text-white (headings/labels/values)       : ${categoryTotals.textWhite}`);
console.log(`- text-slate-100..400 (faint/low contrast)  : ${categoryTotals.textLightSlate}`);
console.log(`- text-slate-500..900 (slate/gray tokens)   : ${categoryTotals.textOtherSlate}`);
console.log(`- bg-white/* (translucent white overlays)   : ${categoryTotals.bgWhiteOpacity}`);
console.log(`- border-white/* (invisible on light cards) : ${categoryTotals.borderWhite}`);
console.log(`- bg-[#...] (hardcoded dark backgrounds)    : ${categoryTotals.bgHex}`);
console.log(`- inline styles with color/background/border: ${categoryTotals.inlineColorStyles}`);
console.log(`- Header hero cards with hardcoded gradient : ${categoryTotals.headerHeroCards}`);
console.log(`- Gradient text elements                    : ${categoryTotals.gradientTextIssues}`);
console.log(`\nTOTAL AFFECTED FILES: ${sorted.length}`);
console.log(`TOTAL AUDIT OCCURRENCES: ${grandTotal}\n`);

console.log('------------------------------------------------------------------------');
console.log('PER-FILE BREAKDOWN (Sorted by severity):');
console.log('------------------------------------------------------------------------');
sorted.forEach(([file, data], i) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${file.padEnd(46)} [Total: ${data.total.toString().padStart(3)}]`);
  const details = [];
  if (data.textWhite) details.push(`text-white: ${data.textWhite}`);
  if (data.textLightSlate) details.push(`text-slate-100-400: ${data.textLightSlate}`);
  if (data.textOtherSlate) details.push(`text-slate-500+: ${data.textOtherSlate}`);
  if (data.bgWhiteOpacity) details.push(`bg-white/*: ${data.bgWhiteOpacity}`);
  if (data.borderWhite) details.push(`border-white/*: ${data.borderWhite}`);
  if (data.bgHex) details.push(`bg-hex: ${data.bgHex}`);
  if (data.inlineColorStyles) details.push(`inline styles: ${data.inlineColorStyles}`);
  if (data.headerHeroCards) details.push(`hero card: ${data.headerHeroCards}`);
  if (data.gradientTextIssues) details.push(`gradient text: ${data.gradientTextIssues}`);
  console.log(`    └─ ${details.join(' | ')}`);
});
