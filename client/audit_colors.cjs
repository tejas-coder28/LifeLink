const fs = require('fs');
const path = require('path');

const clientSrc = path.join(__dirname, 'src');

const patterns = {
  textWhite: /\btext-white\b/g,
  textLightSlate: /\btext-(slate|gray|zinc|neutral)-(100|200|300|400)\b/g,
  textSlateOther: /\btext-(slate|gray|zinc|neutral)-(500|600|700|800|900)\b/g,
  bgWhiteOpacity: /\bbg-white\/[0-9.]+\b/g,
  bgBlackOpacity: /\bbg-black\/[0-9.]+\b/g,
  bgHex: /\bbg-\[#[0-9a-fA-F]+\]/g,
  textHex: /\btext-\[#[0-9a-fA-F]+\]/g,
  borderWhite: /\bborder-white\/[0-9.]+\b/g,
  gradientTextWhite: /bg-clip-text[^\n"'>]*?(from-white|to-white|via-white|to-slate|from-slate)/g,
  inlineColorStyles: /style=\{\{[^}]*?(color|background|backgroundColor|borderColor)\s*:[^}]*?\}\}/g,
};

function getAllFiles(dir, exts = ['.jsx', '.js', '.html']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// Add index.html as well
const files = [...getAllFiles(clientSrc), path.join(__dirname, 'index.html')];
const auditReport = [];

const categoryTotals = {};
for (const key of Object.keys(patterns)) {
  categoryTotals[key] = 0;
}

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const relPath = path.relative(__dirname, f).replace(/\\/g, '/');
  const fileStats = { file: relPath, totalIssues: 0, counts: {} };

  for (const [key, regex] of Object.entries(patterns)) {
    // Reset regex index
    regex.lastIndex = 0;
    const matches = content.match(regex);
    const count = matches ? matches.length : 0;
    fileStats.counts[key] = count;
    fileStats.totalIssues += count;
    categoryTotals[key] += count;
  }

  if (fileStats.totalIssues > 0) {
    auditReport.push(fileStats);
  }
});

auditReport.sort((a, b) => b.totalIssues - a.totalIssues);

console.log('========================================================================');
console.log(' LIFELINK LIGHT MODE HARDCODED COLOR AUDIT REPORT');
console.log('========================================================================\n');

console.log('OVERALL CATEGORY BREAKDOWN:');
for (const [k, v] of Object.entries(categoryTotals)) {
  console.log(`- ${k.padEnd(20)}: ${v}`);
}
console.log(`\nTOTAL INSTANCES: ${Object.values(categoryTotals).reduce((a, b) => a + b, 0)}`);
console.log(`TOTAL AFFECTED FILES: ${auditReport.length}\n`);

console.log('PER-FILE BREAKDOWN:');
auditReport.forEach((item, index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${item.file.padEnd(50)} [Total: ${item.totalIssues.toString().padStart(3)}]`);
  const nonzero = Object.entries(item.counts).filter(([_, c]) => c > 0).map(([k, c]) => `${k}: ${c}`).join(', ');
  console.log(`    └─ ${nonzero}`);
});
