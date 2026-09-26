// Réécrit dans site/babel.js la fonction keccakF déroulée (état dans des variables locales,
// voies de 64 bits en paires de mots de 32 bits), entre les marqueurs « keccak déroulé ».
// Usage : node outils/generer_keccak.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];
const PI = ROT.map((_, i) => { const x = i % 5, y = (i - x) / 5; return y + 5 * ((2 * x + 3 * y) % 5); });
const liste = (n, f) => Array.from({ length: n }, (_, i) => f(i));

const c = [];
c.push('function keccakF(s) {');
c.push('  let ' + liste(50, i => `s${i} = s[${i}]`).join(', ') + ';');
c.push('  let ' + liste(50, i => `b${i}`).join(', ') + ', c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, dl, dh;');
c.push('  for (let r = 0; r < 48; r += 2) {');
const colonnes = liste(10, w => `c${w} = ${[0, 10, 20, 30, 40].map(o => `s${w + o}`).join(' ^ ')};`);
c.push('    ' + colonnes.slice(0, 5).join(' '), '    ' + colonnes.slice(5).join(' '));
for (let x = 0; x < 5; x++) {                                     // θ
  const p = 2 * ((x + 1) % 5), m = 2 * ((x + 4) % 5);
  c.push(`    dl = c${m} ^ ((c${p} << 1) | (c${p + 1} >>> 31)); dh = c${m + 1} ^ ((c${p + 1} << 1) | (c${p} >>> 31));`);
  c.push('    ' + [0, 10, 20, 30, 40].map(y => `s${2 * x + y} ^= dl; s${2 * x + y + 1} ^= dh;`).join(' '));
}
for (let i = 0; i < 25; i++) {                                    // ρ et π
  const n = ROT[i], j = 2 * PI[i], l = `s${2 * i}`, h = `s${2 * i + 1}`;
  if (n === 0) c.push(`    b${j} = ${l}; b${j + 1} = ${h};`);
  else if (n < 32) c.push(`    b${j} = (${l} << ${n}) | (${h} >>> ${32 - n}); b${j + 1} = (${h} << ${n}) | (${l} >>> ${32 - n});`);
  else { const k = n - 32; c.push(`    b${j} = (${h} << ${k}) | (${l} >>> ${32 - k}); b${j + 1} = (${l} << ${k}) | (${h} >>> ${32 - k});`); }
}
for (let y = 0; y < 50; y += 10) {                                // χ
  const t = [];
  for (let x = 0; x < 10; x += 2) {
    const b = y + (x + 2) % 10, d = y + (x + 4) % 10;
    t.push(`s${y + x} = b${y + x} ^ (~b${b} & b${d}); s${y + x + 1} = b${y + x + 1} ^ (~b${b + 1} & b${d + 1});`);
  }
  c.push('    ' + t.slice(0, 3).join(' '), '    ' + t.slice(3).join(' '));
}
c.push('    s0 ^= RC[r]; s1 ^= RC[r + 1];', '  }');           // ι
for (let i = 0; i < 50; i += 10) c.push('  ' + liste(10, k => `s[${i + k}] = s${i + k};`).join(' '));
c.push('}');

const fichier = new URL('../site/babel.js', import.meta.url);
const source = readFileSync(fichier, 'utf8');
const debut = '// <keccak déroulé : node outils/generer_keccak.mjs>\n', fin = '// </keccak déroulé>\n';
const i = source.indexOf(debut), j = source.indexOf(fin);
if (i < 0 || j < i) throw new Error('marqueurs introuvables dans site/babel.js');
writeFileSync(fichier, source.slice(0, i + debut.length) + c.join('\n') + '\n' + source.slice(j));
console.log('keccakF déroulée écrite (%d lignes)', c.length);
