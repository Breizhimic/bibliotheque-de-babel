// Tests du moteur JS : node --test (depuis la racine du projet).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { Bibliotheque, shake256, flux, lireChemin, ecrireChemin, octetsDe, hex, L } from '../site/babel.js';

const lire = chemin => readFileSync(new URL(chemin, import.meta.url));
const VECTEURS = JSON.parse(lire('vecteurs.json').toString('utf8'));
const bib = await Bibliotheque.charger(lire('../site/alphabet_v2.txt').toString('ascii'));
const empreinte = x => hex(new Uint8Array(shake256([octetsDe(x)], 16).buffer, 0, 16));

test('SHAKE-256 identique à celui de Node (OpenSSL)', () => {
  for (const longueur of [0, 1, 135, 136, 137, 271, 272, 1000, 5000]) {
    const donnees = randomBytes(longueur);
    for (const sortie of [1, 32, 136, 137, 999]) {
      const attendu = createHash('shake256', { outputLength: sortie }).update(donnees).digest('hex');
      const obtenu = hex(new Uint8Array(shake256([donnees], sortie).buffer, 0, sortie));
      assert.equal(obtenu, attendu, `entrée ${longueur} o, sortie ${sortie} o`);
    }
  }
});

test('flux identique à Python', () => {
  const f = VECTEURS.flux;
  const etiquette = Uint8Array.from(f.etiquette, c => c.charCodeAt(0));
  assert.deepEqual([...flux(etiquette, new TextEncoder().encode(f.donnees), f.n)], f.mots);
});

test('vecteurs de référence de babel.py', () => {
  for (const cas of VECTEURS.cas) {
    const chemin = lireChemin(cas.chemin);
    assert.equal(ecrireChemin(chemin), cas.chemin);
    const t0 = performance.now();
    const { adresse, livre } = bib.resoudre(chemin);
    const ms = performance.now() - t0;
    assert.equal(empreinte(livre), cas.livre, cas.chemin);
    assert.equal(empreinte(adresse), cas.adresse, cas.chemin);
    assert.deepEqual(bib.emplacement(adresse), cas.emplacement);
    assert.equal(bib.page(livre, chemin.p), cas.page);
    assert.equal(createHash('sha256').update(bib.ecrireAdresse(adresse)).digest('hex'), cas.fichier_sha256);
    console.log(`${cas.chemin.slice(0, 40)}… résolu en ${ms.toFixed(0)} ms`);
  }
});

test('bijection, voisins sans ressemblance, fichier d\'adresse', () => {
  const adresse = new Uint16Array(L).map(() => Math.floor(Math.random() * bib.N));
  const livre = bib.permuter(adresse);
  assert.deepEqual(bib.inverser(livre), adresse);
  const voisin = bib.permuter(bib.decaler(adresse, 1));
  let communs = 0;
  for (let i = 0; i < L; i++) communs += livre[i] === voisin[i];
  assert.ok(communs < 5 * L / bib.N, `${communs} symboles communs`);
  assert.deepEqual(bib.lireAdresse(bib.ecrireAdresse(adresse)), adresse);
  assert.deepEqual(bib.decaler(bib.decaler(adresse, -1e15), 1e15), adresse);
});

test('le cache des adresses de départ ne change aucun résultat', () => {
  const direct = bib.permuter(bib.decaler(bib.inverser(bib.livreDepuisTexte('abc', 5)), 3));
  for (let i = 0; i < 2; i++) assert.deepEqual(bib.resoudre(lireChemin('#v=2&t=abc&at=5&d=3')).livre, direct);
  const { adresse, livre } = bib.resoudre(lireChemin('#v=2&t=abc&at=5'));
  assert.deepEqual(bib.permuter(adresse), livre);
});

test('copier puis chercher une page redonne la page', () => {
  const livre = bib.remplissage(randomBytes(16));
  const texte = bib.page(livre, 7);
  assert.equal(bib.page(bib.livreDepuisTexte(texte, 6 * 3200), 7), texte);
  assert.throws(() => bib.livreDepuisTexte('Borges 1941'), /U\+0031/);
});
