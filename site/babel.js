// Bibliothèque de Babel étendue, version livre entier (alphabet v2, 22 984 symboles).
// Même spécification que babel.py (voir sa docstring) ; tests/vecteurs.json garantit l'accord.
// Module ES sans dépendance, pour le navigateur comme pour Node.

export const PAGES = 410, LIGNES = 40, COLONNES = 80;
export const PAGE = LIGNES * COLONNES;           // 3 200 symboles
export const L = PAGES * PAGE;                   // 1 312 000 symboles par livre
const MOITIE = L / 2;
const TOURS = 6;
export const VOLUMES = 32, ETAGERES = 5, MURS = 4;
export const PAR_HEXAGONE = VOLUMES * ETAGERES * MURS;
const DECALAGE_MAX = 1e15;
const VERSION = '2';
export const EMPREINTE_ALPHABET = 'fc1ba0f125dc08ceb64b39629e3489a05ffb9c25091093dd2882b7e7cfaae619';

const ascii = s => Uint8Array.from(s, c => c.charCodeAt(0));
const DOMAINE = ascii('babel-v2/');
const ENTETE_ADRESSE = ascii('BABEL v2 ' + EMPREINTE_ALPHABET.slice(0, 16) + '\n');
export const octetsDe = u16 => new Uint8Array(u16.buffer, u16.byteOffset, u16.byteLength);
export const hex = octets => Array.from(octets, b => b.toString(16).padStart(2, '0')).join('');

if (new Uint8Array(Uint16Array.of(1).buffer)[0] !== 1) throw new Error('machine gros-boutienne non prise en charge');

// ---- Keccak-f[1600] et SHAKE-256 (FIPS 202), voies de 64 bits en paires (faible, fort) ----

const RC = Uint32Array.of(
  0x00000001, 0x00000000, 0x00008082, 0x00000000, 0x0000808a, 0x80000000, 0x80008000, 0x80000000,
  0x0000808b, 0x00000000, 0x80000001, 0x00000000, 0x80008081, 0x80000000, 0x00008009, 0x80000000,
  0x0000008a, 0x00000000, 0x00000088, 0x00000000, 0x80008009, 0x00000000, 0x8000000a, 0x00000000,
  0x8000808b, 0x00000000, 0x0000008b, 0x80000000, 0x00008089, 0x80000000, 0x00008003, 0x80000000,
  0x00008002, 0x80000000, 0x00000080, 0x80000000, 0x0000800a, 0x00000000, 0x8000000a, 0x80000000,
  0x80008081, 0x80000000, 0x00008080, 0x80000000, 0x80000001, 0x00000000, 0x80008008, 0x80000000);
// Permutation déroulée, générée : la version en boucles était 5 à 10 fois plus lente.
// <keccak déroulé : node outils/generer_keccak.mjs>
function keccakF(s) {
  let s0 = s[0], s1 = s[1], s2 = s[2], s3 = s[3], s4 = s[4], s5 = s[5], s6 = s[6], s7 = s[7], s8 = s[8], s9 = s[9], s10 = s[10], s11 = s[11], s12 = s[12], s13 = s[13], s14 = s[14], s15 = s[15], s16 = s[16], s17 = s[17], s18 = s[18], s19 = s[19], s20 = s[20], s21 = s[21], s22 = s[22], s23 = s[23], s24 = s[24], s25 = s[25], s26 = s[26], s27 = s[27], s28 = s[28], s29 = s[29], s30 = s[30], s31 = s[31], s32 = s[32], s33 = s[33], s34 = s[34], s35 = s[35], s36 = s[36], s37 = s[37], s38 = s[38], s39 = s[39], s40 = s[40], s41 = s[41], s42 = s[42], s43 = s[43], s44 = s[44], s45 = s[45], s46 = s[46], s47 = s[47], s48 = s[48], s49 = s[49];
  let b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17, b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33, b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, dl, dh;
  for (let r = 0; r < 48; r += 2) {
    c0 = s0 ^ s10 ^ s20 ^ s30 ^ s40; c1 = s1 ^ s11 ^ s21 ^ s31 ^ s41; c2 = s2 ^ s12 ^ s22 ^ s32 ^ s42; c3 = s3 ^ s13 ^ s23 ^ s33 ^ s43; c4 = s4 ^ s14 ^ s24 ^ s34 ^ s44;
    c5 = s5 ^ s15 ^ s25 ^ s35 ^ s45; c6 = s6 ^ s16 ^ s26 ^ s36 ^ s46; c7 = s7 ^ s17 ^ s27 ^ s37 ^ s47; c8 = s8 ^ s18 ^ s28 ^ s38 ^ s48; c9 = s9 ^ s19 ^ s29 ^ s39 ^ s49;
    dl = c8 ^ ((c2 << 1) | (c3 >>> 31)); dh = c9 ^ ((c3 << 1) | (c2 >>> 31));
    s0 ^= dl; s1 ^= dh; s10 ^= dl; s11 ^= dh; s20 ^= dl; s21 ^= dh; s30 ^= dl; s31 ^= dh; s40 ^= dl; s41 ^= dh;
    dl = c0 ^ ((c4 << 1) | (c5 >>> 31)); dh = c1 ^ ((c5 << 1) | (c4 >>> 31));
    s2 ^= dl; s3 ^= dh; s12 ^= dl; s13 ^= dh; s22 ^= dl; s23 ^= dh; s32 ^= dl; s33 ^= dh; s42 ^= dl; s43 ^= dh;
    dl = c2 ^ ((c6 << 1) | (c7 >>> 31)); dh = c3 ^ ((c7 << 1) | (c6 >>> 31));
    s4 ^= dl; s5 ^= dh; s14 ^= dl; s15 ^= dh; s24 ^= dl; s25 ^= dh; s34 ^= dl; s35 ^= dh; s44 ^= dl; s45 ^= dh;
    dl = c4 ^ ((c8 << 1) | (c9 >>> 31)); dh = c5 ^ ((c9 << 1) | (c8 >>> 31));
    s6 ^= dl; s7 ^= dh; s16 ^= dl; s17 ^= dh; s26 ^= dl; s27 ^= dh; s36 ^= dl; s37 ^= dh; s46 ^= dl; s47 ^= dh;
    dl = c6 ^ ((c0 << 1) | (c1 >>> 31)); dh = c7 ^ ((c1 << 1) | (c0 >>> 31));
    s8 ^= dl; s9 ^= dh; s18 ^= dl; s19 ^= dh; s28 ^= dl; s29 ^= dh; s38 ^= dl; s39 ^= dh; s48 ^= dl; s49 ^= dh;
    b0 = s0; b1 = s1;
    b20 = (s2 << 1) | (s3 >>> 31); b21 = (s3 << 1) | (s2 >>> 31);
    b40 = (s5 << 30) | (s4 >>> 2); b41 = (s4 << 30) | (s5 >>> 2);
    b10 = (s6 << 28) | (s7 >>> 4); b11 = (s7 << 28) | (s6 >>> 4);
    b30 = (s8 << 27) | (s9 >>> 5); b31 = (s9 << 27) | (s8 >>> 5);
    b32 = (s11 << 4) | (s10 >>> 28); b33 = (s10 << 4) | (s11 >>> 28);
    b2 = (s13 << 12) | (s12 >>> 20); b3 = (s12 << 12) | (s13 >>> 20);
    b22 = (s14 << 6) | (s15 >>> 26); b23 = (s15 << 6) | (s14 >>> 26);
    b42 = (s17 << 23) | (s16 >>> 9); b43 = (s16 << 23) | (s17 >>> 9);
    b12 = (s18 << 20) | (s19 >>> 12); b13 = (s19 << 20) | (s18 >>> 12);
    b14 = (s20 << 3) | (s21 >>> 29); b15 = (s21 << 3) | (s20 >>> 29);
    b34 = (s22 << 10) | (s23 >>> 22); b35 = (s23 << 10) | (s22 >>> 22);
    b4 = (s25 << 11) | (s24 >>> 21); b5 = (s24 << 11) | (s25 >>> 21);
    b24 = (s26 << 25) | (s27 >>> 7); b25 = (s27 << 25) | (s26 >>> 7);
    b44 = (s29 << 7) | (s28 >>> 25); b45 = (s28 << 7) | (s29 >>> 25);
    b46 = (s31 << 9) | (s30 >>> 23); b47 = (s30 << 9) | (s31 >>> 23);
    b16 = (s33 << 13) | (s32 >>> 19); b17 = (s32 << 13) | (s33 >>> 19);
    b36 = (s34 << 15) | (s35 >>> 17); b37 = (s35 << 15) | (s34 >>> 17);
    b6 = (s36 << 21) | (s37 >>> 11); b7 = (s37 << 21) | (s36 >>> 11);
    b26 = (s38 << 8) | (s39 >>> 24); b27 = (s39 << 8) | (s38 >>> 24);
    b28 = (s40 << 18) | (s41 >>> 14); b29 = (s41 << 18) | (s40 >>> 14);
    b48 = (s42 << 2) | (s43 >>> 30); b49 = (s43 << 2) | (s42 >>> 30);
    b18 = (s45 << 29) | (s44 >>> 3); b19 = (s44 << 29) | (s45 >>> 3);
    b38 = (s47 << 24) | (s46 >>> 8); b39 = (s46 << 24) | (s47 >>> 8);
    b8 = (s48 << 14) | (s49 >>> 18); b9 = (s49 << 14) | (s48 >>> 18);
    s0 = b0 ^ (~b2 & b4); s1 = b1 ^ (~b3 & b5); s2 = b2 ^ (~b4 & b6); s3 = b3 ^ (~b5 & b7); s4 = b4 ^ (~b6 & b8); s5 = b5 ^ (~b7 & b9);
    s6 = b6 ^ (~b8 & b0); s7 = b7 ^ (~b9 & b1); s8 = b8 ^ (~b0 & b2); s9 = b9 ^ (~b1 & b3);
    s10 = b10 ^ (~b12 & b14); s11 = b11 ^ (~b13 & b15); s12 = b12 ^ (~b14 & b16); s13 = b13 ^ (~b15 & b17); s14 = b14 ^ (~b16 & b18); s15 = b15 ^ (~b17 & b19);
    s16 = b16 ^ (~b18 & b10); s17 = b17 ^ (~b19 & b11); s18 = b18 ^ (~b10 & b12); s19 = b19 ^ (~b11 & b13);
    s20 = b20 ^ (~b22 & b24); s21 = b21 ^ (~b23 & b25); s22 = b22 ^ (~b24 & b26); s23 = b23 ^ (~b25 & b27); s24 = b24 ^ (~b26 & b28); s25 = b25 ^ (~b27 & b29);
    s26 = b26 ^ (~b28 & b20); s27 = b27 ^ (~b29 & b21); s28 = b28 ^ (~b20 & b22); s29 = b29 ^ (~b21 & b23);
    s30 = b30 ^ (~b32 & b34); s31 = b31 ^ (~b33 & b35); s32 = b32 ^ (~b34 & b36); s33 = b33 ^ (~b35 & b37); s34 = b34 ^ (~b36 & b38); s35 = b35 ^ (~b37 & b39);
    s36 = b36 ^ (~b38 & b30); s37 = b37 ^ (~b39 & b31); s38 = b38 ^ (~b30 & b32); s39 = b39 ^ (~b31 & b33);
    s40 = b40 ^ (~b42 & b44); s41 = b41 ^ (~b43 & b45); s42 = b42 ^ (~b44 & b46); s43 = b43 ^ (~b45 & b47); s44 = b44 ^ (~b46 & b48); s45 = b45 ^ (~b47 & b49);
    s46 = b46 ^ (~b48 & b40); s47 = b47 ^ (~b49 & b41); s48 = b48 ^ (~b40 & b42); s49 = b49 ^ (~b41 & b43);
    s0 ^= RC[r]; s1 ^= RC[r + 1];
  }
  s[0] = s0; s[1] = s1; s[2] = s2; s[3] = s3; s[4] = s4; s[5] = s5; s[6] = s6; s[7] = s7; s[8] = s8; s[9] = s9;
  s[10] = s10; s[11] = s11; s[12] = s12; s[13] = s13; s[14] = s14; s[15] = s15; s[16] = s16; s[17] = s17; s[18] = s18; s[19] = s19;
  s[20] = s20; s[21] = s21; s[22] = s22; s[23] = s23; s[24] = s24; s[25] = s25; s[26] = s26; s[27] = s27; s[28] = s28; s[29] = s29;
  s[30] = s30; s[31] = s31; s[32] = s32; s[33] = s33; s[34] = s34; s[35] = s35; s[36] = s36; s[37] = s37; s[38] = s38; s[39] = s39;
  s[40] = s40; s[41] = s41; s[42] = s42; s[43] = s43; s[44] = s44; s[45] = s45; s[46] = s46; s[47] = s47; s[48] = s48; s[49] = s49;
}
// </keccak déroulé>

/** SHAKE-256 de la concaténation des morceaux (Uint8Array) ; renvoie ceil(nOctets / 4) mots petit-boutiens. */
export function shake256(morceaux, nOctets) {
  let longueur = 0;
  for (const m of morceaux) longueur += m.length;
  const msg = new Uint8Array((Math.floor(longueur / 136) + 1) * 136);
  let o = 0;
  for (const m of morceaux) { msg.set(m, o); o += m.length; }
  msg[longueur] ^= 0x1f;
  msg[msg.length - 1] ^= 0x80;
  const m32 = new Uint32Array(msg.buffer), s = new Uint32Array(50);
  for (let b = 0; b < m32.length; b += 34) {
    for (let k = 0; k < 34; k++) s[k] ^= m32[b + k];
    keccakF(s);
  }
  const nMots = Math.ceil(nOctets / 4), sortie = new Uint32Array(nMots);
  for (let b = 0; ; b += 34) {
    const n = Math.min(34, nMots - b);
    for (let k = 0; k < n; k++) sortie[b + k] = s[k];
    if (b + 34 >= nMots) return sortie;
    keccakF(s);
  }
}

/** n entiers de 32 bits tirés de SHAKE-256(domaine | étiquette | données). */
export const flux = (etiquette, donnees, n) => shake256([DOMAINE, etiquette, donnees], 4 * n);

// ---- Chemins (fragments d'URL) ----

function versB64(octets) {
  return btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisB64(texte) {
  if (!/^[A-Za-z0-9_-]{2,86}$/.test(texte) || texte.length % 4 === 1) throw new Error('graine invalide');
  const binaire = atob(texte.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - texte.length % 4) % 4));
  return Uint8Array.from(binaire, c => c.charCodeAt(0));
}

function entier(texte, nom) {
  if (!/^-?[0-9]{1,16}$/.test(texte)) throw new Error(nom + ' invalide');
  return Number(texte);
}

/** '#v=2&h=...' -> objet chemin ; lève une erreur si le chemin est invalide. */
export function lireChemin(fragment) {
  const champs = new Map();
  for (const morceau of fragment.replace(/^#+/, '').split('&')) {
    if (!morceau) continue;
    const i = morceau.indexOf('=');
    try {
      champs.set(i < 0 ? morceau : morceau.slice(0, i), i < 0 ? '' : decodeURIComponent(morceau.slice(i + 1)));
    } catch { throw new Error('chemin mal encodé'); }
  }
  if (champs.get('v') !== VERSION) throw new Error('version absente ou inconnue (v=2 attendu)');
  if (champs.has('h') === champs.has('t')) throw new Error('il faut soit h (hasard), soit t (texte)');
  const chemin = { d: entier(champs.get('d') ?? '0', 'décalage'), p: entier(champs.get('p') ?? '1', 'page') };
  if (Math.abs(chemin.d) > DECALAGE_MAX) throw new Error('décalage trop grand');
  if (chemin.p < 1 || chemin.p > PAGES) throw new Error('page hors du livre');
  if (champs.has('h')) {
    chemin.h = depuisB64(champs.get('h'));
  } else {
    chemin.t = champs.get('t');
    chemin.at = entier(champs.get('at') ?? '0', 'position');
    if (chemin.at < 0 || chemin.at >= L) throw new Error('position hors du livre');
    if (champs.has('g')) chemin.g = depuisB64(champs.get('g'));
  }
  return chemin;
}

/** Objet chemin -> '#v=2&...' (forme canonique, identique côté Python). */
export function ecrireChemin(chemin) {
  const m = ['v=' + VERSION];
  if (chemin.h) {
    m.push('h=' + versB64(chemin.h));
  } else {
    m.push('t=' + encodeURIComponent(chemin.t));
    if (chemin.at) m.push('at=' + chemin.at);
    if (chemin.g) m.push('g=' + versB64(chemin.g));
  }
  if (chemin.d) m.push('d=' + chemin.d);
  if ((chemin.p ?? 1) !== 1) m.push('p=' + chemin.p);
  return '#' + m.join('&');
}

// ---- Bibliothèque : livres (Uint16Array de L indices) et adresses (L chiffres en base N) ----

export class Bibliotheque {
  constructor(symboles) {
    this.SYM = symboles;
    this.N = symboles.length;
    this.IDX = new Map(symboles.map((c, i) => [c, i]));
    this.ESPACE = this.IDX.get(' ');
  }

  /** Alphabet au format de site/alphabet_v2.txt ; son empreinte SHA-256 est vérifiée si WebCrypto est là. */
  static async charger(texteHex) {
    const symboles = texteHex.split(/\s+/).filter(Boolean).map(h => String.fromCodePoint(parseInt(h, 16)));
    if (globalThis.crypto?.subtle) {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(symboles.join('')));
      if (hex(new Uint8Array(d)) !== EMPREINTE_ALPHABET) throw new Error('alphabet inattendu : empreinte différente de la v2');
    }
    return new Bibliotheque(symboles);
  }

  #f(tour, moitie) {
    return flux(Uint8Array.of(0x46, tour), octetsDe(moitie), MOITIE);  // 0x46 = 'F'
  }

  /** Adresse -> livre. */
  permuter(adresse) {
    const N = this.N;
    let a = adresse.slice(0, MOITIE), b = adresse.slice(MOITIE);
    for (let r = 0; r < TOURS; r++) {
      const w = this.#f(r, b), c = new Uint16Array(MOITIE);
      for (let j = 0; j < MOITIE; j++) c[j] = (a[j] + w[j] % N) % N;
      a = b; b = c;
    }
    return joindre(a, b);
  }

  /** Livre -> adresse : inverse exact de permuter. */
  inverser(livre) {
    const N = this.N;
    let a = livre.slice(0, MOITIE), b = livre.slice(MOITIE);
    for (let r = TOURS - 1; r >= 0; r--) {
      const w = this.#f(r, a), c = new Uint16Array(MOITIE);
      for (let j = 0; j < MOITIE; j++) c[j] = (b[j] + N - w[j] % N) % N;
      b = a; a = c;
    }
    return joindre(a, b);
  }

  #tirage(etiquette, graine) {
    const w = flux(ascii(etiquette), graine, L), x = new Uint16Array(L);
    for (let i = 0; i < L; i++) x[i] = w[i] % this.N;
    return x;
  }

  adresseHasard(graine) { return this.#tirage('H', graine); }

  /** Livre de fond : espaces, ou symboles tirés de la graine. */
  remplissage(graine = null) {
    return graine ? this.#tirage('R', graine) : new Uint16Array(L).fill(this.ESPACE);
  }

  /** Livre où le texte commence à la position debut ; mêmes règles de saut de ligne que babel.py. */
  livreDepuisTexte(texte, debut = 0, graine = null) {
    texte = texte.replace(/\r\n?/g, '\n');
    const inconnus = [...new Set([...texte].filter(c => c !== '\n' && !this.IDX.has(c)))]
      .sort((x, y) => x.codePointAt(0) - y.codePointAt(0));
    if (inconnus.length) {
      throw new Error('hors alphabet : ' + inconnus.map(c =>
        `${c} (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(' '));
    }
    if (!(Number.isInteger(debut) && debut >= 0 && debut < L)) throw new Error('position hors du livre');
    const livre = this.remplissage(graine);
    for (const [pos, c] of placer(texte, debut)) {
      if (pos >= L) throw new Error('texte trop long pour tenir dans le livre');
      livre[pos] = this.IDX.get(c);
    }
    return livre;
  }

  /** Adresse + d modulo N^L (|d| <= 1e15). */
  decaler(adresse, d) {
    const x = adresse.slice(), N = this.N;
    let retenue = d;
    for (let i = 0; retenue !== 0 && i < L; i++) {
      const t = x[i] + retenue;
      retenue = Math.floor(t / N);
      x[i] = t - retenue * N;
    }
    return x;
  }

  /** Mur, étagère, volume (à partir de 1) et empreinte courte de l'hexagone. */
  emplacement(adresse) {
    let reste = 0;
    for (let i = L - 1; i >= 0; i--) reste = (reste * this.N + adresse[i]) % PAR_HEXAGONE;
    const premier = this.decaler(adresse, -reste);
    const h = shake256([DOMAINE, ascii('X'), octetsDe(premier)], 8);
    return {
      hexagone: hex(new Uint8Array(h.buffer, 0, 8)),
      mur: Math.floor(reste / (ETAGERES * VOLUMES)) + 1,
      etagere: Math.floor(reste / VOLUMES) % ETAGERES + 1,
      volume: reste % VOLUMES + 1,
    };
  }

  /** Lignes (40 chaînes de 80 symboles) de la page numero (1 à 410). */
  lignes(livre, numero) {
    const debut = (numero - 1) * PAGE, lignes = [];
    for (let k = 0; k < LIGNES; k++) {
      let s = '';
      for (let j = 0; j < COLONNES; j++) s += this.SYM[livre[debut + k * COLONNES + j]];
      lignes.push(s);
    }
    return lignes;
  }

  page(livre, numero) { return this.lignes(livre, numero).join('\n'); }

  #bases = new Map();  // adresses de départ récentes : parcourir les voisins ne coûte qu'une permutation

  /** Chemin -> { adresse, livre } (tableaux neufs, transférables). */
  resoudre(chemin) {
    const cle = ecrireChemin({ ...chemin, d: 0, p: 1 });
    let base = this.#bases.get(cle);
    if (!base) {
      base = chemin.h ? this.adresseHasard(chemin.h)
        : this.inverser(this.livreDepuisTexte(chemin.t, chemin.at, chemin.g ?? null));
      this.#bases.set(cle, base);
      if (this.#bases.size > 6) this.#bases.delete(this.#bases.keys().next().value);
    }
    if (chemin.t && !chemin.d) {
      return { adresse: base.slice(), livre: this.livreDepuisTexte(chemin.t, chemin.at, chemin.g ?? null) };
    }
    const adresse = this.decaler(base, chemin.d);
    return { adresse, livre: this.permuter(adresse) };
  }

  /** Adresse -> fichier : en-tête, puis paires x0 + N*x1 (< 2^30) sur 30 bits, poids faibles d'abord. */
  ecrireAdresse(adresse) {
    const N = this.N, sortie = new Uint8Array(ENTETE_ADRESSE.length + L / 8 * 15);
    sortie.set(ENTETE_ADRESSE);
    let o = ENTETE_ADRESSE.length, acc = 0, nb = 0;
    for (let k = 0; k < L; k += 2) {
      acc += (adresse[k] + N * adresse[k + 1]) * 2 ** nb;
      nb += 30;
      while (nb >= 8) { sortie[o++] = acc % 256; acc = Math.floor(acc / 256); nb -= 8; }
    }
    return sortie;
  }

  lireAdresse(octets) {
    const e = ENTETE_ADRESSE;
    if (octets.length !== e.length + L / 8 * 15 || e.some((b, i) => octets[i] !== b)) {
      throw new Error("fichier d'adresse invalide ou d'une autre version");
    }
    const N = this.N, adresse = new Uint16Array(L);
    let acc = 0, nb = 0, k = 0;
    for (let i = e.length; i < octets.length; i++) {
      acc += octets[i] * 2 ** nb;
      nb += 8;
      if (nb >= 30) {
        const paire = acc % 0x40000000;
        acc = Math.floor(acc / 0x40000000);
        nb -= 30;
        if (paire >= N * N) throw new Error("fichier d'adresse corrompu");
        adresse[k++] = paire % N;
        adresse[k++] = Math.floor(paire / N);
      }
    }
    return adresse;
  }
}

/**
 * Positions [pos, symbole] où s'écrit le texte à partir de debut. Un saut de ligne mène au début
 * de la ligne suivante, sauf juste après une ligne remplie jusqu'au bout (règle de babel.py).
 */
export function placer(texte, debut) {
  const places = [];
  let pos = debut, lignePleine = false;
  for (const c of texte.replace(/\r\n?/g, '\n')) {
    if (c === '\n') {
      if (!lignePleine) pos = (Math.floor(pos / COLONNES) + 1) * COLONNES;
      lignePleine = false;
      continue;
    }
    places.push([pos++, c]);
    lignePleine = pos % COLONNES === 0;
  }
  return places;
}

function joindre(a, b) {
  const x = new Uint16Array(L);
  x.set(a, 0);
  x.set(b, MOITIE);
  return x;
}
