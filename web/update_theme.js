const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./app');

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace slate with zinc
  content = content.replace(/slate-/g, 'zinc-');
  
  // Remove shadows
  content = content.replace(/shadow-sm/g, '');
  content = content.replace(/shadow /g, ' ');
  content = content.replace(/shadow"/g, '"');
  
  // Replace bg-white with bg-zinc-50 on card-like elements (border, rounded)
  // Actually, let's just make all surfaces that had a border and were white become zinc-50
  // Or we can just do: 'bg-white' -> 'bg-zinc-50'
  // But wait, what if bg-white is used for a container that should be white? 
  // Let's replace 'bg-white' with 'bg-zinc-50' globally except for specific cases?
  // Let's replace 'bg-white' with 'bg-zinc-50' if it's next to border.
  content = content.replace(/border-zinc-200 bg-white/g, 'border-zinc-200 bg-zinc-50');
  content = content.replace(/bg-white px-/g, 'bg-zinc-50 px-'); // for buttons and small cards
  content = content.replace(/bg-white p-/g, 'bg-zinc-50 p-'); // for panels
  content = content.replace(/bg-white shadow/g, 'bg-zinc-50');
  content = content.replace(/bg-white rounded/g, 'bg-zinc-50 rounded');
  content = content.replace(/rounded-lg border border-zinc-200 bg-white/g, 'rounded-lg border border-zinc-200 bg-zinc-50');
  content = content.replace(/rounded-xl border border-zinc-200 bg-white/g, 'rounded-xl border border-zinc-200 bg-zinc-50');
  
  // Also any remaining `bg-white` inside className that have borders
  content = content.replace(/bg-white/g, 'bg-zinc-50');
  
  // But wait, the main background must remain #FFFFFF. In globals.css --background is #ffffff. So that's fine.
  
  // Action buttons
  // bg-zinc-950 -> bg-zinc-900
  content = content.replace(/bg-zinc-950/g, 'bg-zinc-900');
  // hover:bg-zinc-800 -> hover:bg-zinc-800 is fine
  // bg-[#f41144] -> bg-zinc-900
  content = content.replace(/bg-\[#f41144\]/g, 'bg-zinc-900');
  // hover:bg-rose-600 -> hover:bg-zinc-800
  content = content.replace(/hover:bg-rose-600/g, 'hover:bg-zinc-800');
  // bg-rose-600 -> bg-zinc-900
  content = content.replace(/bg-rose-600/g, 'bg-zinc-900');
  // hover:bg-rose-700 -> hover:bg-zinc-800
  content = content.replace(/hover:bg-rose-700/g, 'hover:bg-zinc-800');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
console.log('Theme updated!');
