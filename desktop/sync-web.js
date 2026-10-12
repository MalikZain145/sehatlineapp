// Copy the latest Expo web build (../frontend/dist) into ./web so the desktop
// app ships the current UI. Run automatically before packaging.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'frontend', 'dist');
const dst = path.join(__dirname, 'web');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

if (!fs.existsSync(src)) {
  console.error('ERROR: web build not found at', src);
  console.error('Build it first:  cd frontend  &&  npx expo export -p web --output-dir dist');
  process.exit(1);
}
fs.rmSync(dst, { recursive: true, force: true });
copyDir(src, dst);
console.log('synced web build ->', dst);
