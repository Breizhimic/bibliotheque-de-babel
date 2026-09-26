// Contrôle de l'alphabet v2 avec les données Unicode du moteur JS (Node 24 : Unicode 17).
// node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const texte = readFileSync(new URL('../site/alphabet_v2.txt', import.meta.url), 'ascii');
const SYM = texte.split(/\s+/).filter(Boolean).map(h => String.fromCodePoint(parseInt(h, 16)));

test('taille et empreinte', () => {
  assert.equal(SYM.length, 22984);
  assert.equal(new Set(SYM).size, 22984);
  const empreinte = createHash('sha256').update(SYM.join(''), 'utf8').digest('hex');
  assert.equal(empreinte, 'fc1ba0f125dc08ceb64b39629e3489a05ffb9c25091093dd2882b7e7cfaae619');
});

test('stable sous NFC (Unicode du moteur JS)', () => {
  assert.deepEqual(SYM.filter(c => c.normalize('NFC') !== c), []);
});

test('aucun caractère non assigné, chiffre, symbole ou format', () => {
  assert.deepEqual(SYM.filter(c => /[\p{Cn}\p{N}\p{S}\p{Cf}\p{Cc}]/u.test(c)), []);
});
