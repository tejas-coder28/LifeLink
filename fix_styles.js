const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /text-slate-[56789]00/g, replacement: 'text-black' },
  { regex: /text-gray-[56789]00/g, replacement: 'text-black' },
  { regex: /bg-\[\#151c2e\]\/70/g, replacement: '' },
  { regex: /hover:bg-\[\#1a233a\]/g, replacement: '' },
  { regex: /hover:text-white/g, replacement: 'hover:text-rose-500' } // for some light buttons
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const { regex, replacement } of replacements) {
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
      if (file === 'node_modules' || file === '.git') continue;
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'client', 'src'));
console.log('Done replacing styles.');
