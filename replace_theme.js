const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /bg-\[\#0b0f19\]/g, replacement: 'bg-lightbg' },
  { regex: /bg-darkbg-card/g, replacement: 'bg-white shadow-sm' },
  { regex: /bg-darkbg-hover/g, replacement: 'bg-slate-50' },
  { regex: /bg-darkbg/g, replacement: 'bg-lightbg' },
  { regex: /border-darkbg-border/g, replacement: 'border-slate-200' },
  { regex: /text-slate-100/g, replacement: 'text-slate-900' },
  { regex: /text-slate-200/g, replacement: 'text-slate-800' },
  { regex: /text-slate-300/g, replacement: 'text-slate-700' },
  { regex: /text-slate-400/g, replacement: 'text-slate-500' },
  { regex: /hover:bg-darkbg-hover/g, replacement: 'hover:bg-slate-50' },
  { regex: /from-darkbg/g, replacement: 'from-lightbg' },
  { regex: /to-darkbg/g, replacement: 'to-lightbg' },
  { regex: /from-\[\#0b0f19\]/g, replacement: 'from-lightbg' },
  { regex: /via-\[\#0b0f19\]/g, replacement: 'via-lightbg' },
  { regex: /bg-slate-800\/50/g, replacement: 'bg-slate-50' },
  { regex: /bg-slate-800/g, replacement: 'bg-white' },
  { regex: /bg-slate-900/g, replacement: 'bg-lightbg' },
  { regex: /border-slate-700/g, replacement: 'border-slate-200' },
  { regex: /border-slate-800/g, replacement: 'border-slate-200' },
  { regex: /border-gray-800/g, replacement: 'border-gray-200' },
  { regex: /text-gray-400/g, replacement: 'text-gray-500' },
  { regex: /text-white/g, replacement: 'text-slate-900' }, // Caution with buttons!
  { regex: /ring-slate-700/g, replacement: 'ring-slate-200' },
  { regex: /ring-slate-800/g, replacement: 'ring-slate-200' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Be careful with text-white as it might be used in primary buttons.
  // We'll run a custom logic for text-white: only replace if it's not inside a button with brand colors.
  // Actually, a simpler way is to replace text-white with text-slate-900, but then fix buttons later, or avoid text-white.
  // Let's remove text-white replacement for now, just to be safe.
  
  for (const { regex, replacement } of replacements) {
    if (regex.source === 'text-white') continue;
    content = content.replace(regex, replacement);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'client', 'src'));
console.log('Done replacing.');
