import fs from 'fs';

const files = fs.readdirSync('/home/z/my-project/scripts/research').filter(f => f.endsWith('.json') && f.startsWith('r'));
let out = [];
for (const f of files.sort()) {
  try {
    const data = JSON.parse(fs.readFileSync(`/home/z/my-project/scripts/research/${f}`, 'utf8'));
    const items = Array.isArray(data) ? data : (data.results || data.data || []);
    out.push(`\n===== ${f} =====`);
    for (const it of items.slice(0, 8)) {
      out.push(`- [${it.host_name || ''}] ${it.name}\n  ${(it.snippet || '').slice(0, 400)}`);
    }
  } catch (e) { out.push(`${f}: ERR ${e.message}`); }
}
fs.writeFileSync('/home/z/my-project/scripts/research/SUMMARY.txt', out.join('\n'));
console.log('done', files.length);
