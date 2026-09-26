// Interface de la bibliothèque : l'URL (#v=2&...) décrit le chemin vers le livre affiché.
import { Bibliotheque, lireChemin, ecrireChemin, placer, PAGES, LIGNES, COLONNES, PAGE, L } from './babel.js';

const $ = id => document.getElementById(id);
const MARQUE = /^\p{M}$/u;
const FICHIER = '#fichier';            // livre ouvert depuis un fichier d'adresse : pas de chemin court

const etat = {
  bib: null, cle: null, chemin: null, livre: null, adresse: null, emplacement: null,
  p: 1, places: null, mode: 'texte',
};

try { if (localStorage.getItem('babel-mode') === 'grille') etat.mode = 'grille'; } catch { /* stockage bloqué */ }

// ---- Calcul des livres dans un travailleur ; seul le résultat de la dernière demande compte ----

class Obsolete extends Error {}
const travailleur = new Worker(new URL('travailleur.js', import.meta.url), { type: 'module' });
const attentes = new Map();
let derniere = 0;

travailleur.onmessage = ({ data }) => {
  const attente = attentes.get(data.id);
  attentes.delete(data.id);
  if (!attente) return;
  if (data.id !== derniere) attente.ko(new Obsolete());
  else if (data.erreur) attente.ko(new Error(data.erreur));
  else attente.ok(data);
};

function calculer(message, transfert = []) {
  const id = ++derniere;
  return new Promise((ok, ko) => {
    attentes.set(id, { ok, ko });
    travailleur.postMessage({ id, ...message }, transfert);
  });
}

const graine = () => crypto.getRandomValues(new Uint8Array(16));
const cleDe = chemin => ecrireChemin({ ...chemin, p: 1 });

function signaler(contenu, classe = '') {
  const m = $('message');
  m.className = 'message ' + classe;
  m.replaceChildren(...[].concat(contenu));
}

function lien(texte, fragment) {
  return Object.assign(document.createElement('a'), { href: fragment, textContent: texte });
}

// ---- Navigation : l'URL est la source de vérité ----

async function suivreUrl() {
  const fragment = location.hash;
  if (fragment === FICHIER) {
    if (etat.chemin === null && etat.livre) return dessiner();
    return signaler("Ce livre venait d'un fichier d'adresse : rouvrez le fichier.", 'erreur');
  }
  if (!fragment || fragment === '#') {
    history.replaceState(null, '', ecrireChemin({ h: graine(), d: 0, p: 1 }));
    return suivreUrl();
  }
  let chemin;
  try {
    chemin = lireChemin(fragment);
  } catch (e) {
    return signaler('Lien invalide : ' + e.message, 'erreur');
  }
  etat.p = chemin.p;
  if (cleDe(chemin) === etat.cle) {
    etat.chemin = chemin;
    return dessiner();
  }
  signaler('Calcul du livre', 'attente');
  try {
    const r = await calculer({ fragment });
    Object.assign(etat, {
      cle: cleDe(chemin), chemin, livre: r.livre, adresse: r.adresse, emplacement: r.emplacement,
      places: chemin.t && !chemin.d ? new Set(placer(chemin.t, chemin.at).map(([pos]) => pos)) : null,
    });
    signaler(presenter(chemin));
    dessiner();
  } catch (e) {
    if (!(e instanceof Obsolete)) signaler('Erreur : ' + e.message, 'erreur');
  }
}

function presenter(chemin) {
  if (!chemin.t) return chemin.d ? `À ${chemin.d} volume(s) du livre tiré au hasard.` : '';
  if (chemin.d) return [`À ${chemin.d} volume(s) du livre qui contient votre texte. `, lien('Revenir au texte', ecrireChemin({ ...chemin, d: 0, p: debutTexte(chemin) }))];
  const at = chemin.at, parties = [
    `Votre texte commence page ${Math.floor(at / PAGE) + 1}, ligne ${Math.floor(at % PAGE / COLONNES) + 1}, colonne ${at % COLONNES + 1}. `,
  ];
  for (const forme of ['NFC', 'NFD']) {
    const variante = chemin.t.normalize(forme);
    if (variante !== chemin.t && inconnus(variante).length === 0) {
      parties.push(`Même aspect, autre livre (${forme}) : `, lien('variante', ecrireChemin({ ...chemin, t: variante })), '. ');
    }
  }
  return parties;
}

const debutTexte = chemin => Math.floor(chemin.at / PAGE) + 1;

function allerAuVoisin(d) {
  if (!etat.chemin) return signaler("Les voisins d'un livre ouvert depuis un fichier n'ont pas de lien court.", 'erreur');
  const total = etat.chemin.d + d;
  if (Math.abs(total) > 1e15) return signaler('Décalage trop grand.', 'erreur');
  location.hash = ecrireChemin({ ...etat.chemin, d: total });
}

function allerALaPage(p) {
  if (!etat.livre) return;
  etat.p = Math.min(PAGES, Math.max(1, p || 1));
  if (etat.chemin) {
    etat.chemin.p = etat.p;
    history.replaceState(null, '', ecrireChemin(etat.chemin));
  }
  dessiner();
}

// ---- Rendu ----

function dessiner() {
  const e = etat.emplacement, h = e.hexagone;
  $('emplacement').replaceChildren(
    'Hexagone ', Object.assign(document.createElement('span'), {
      className: 'hexagone', textContent: `${h.slice(0, 4)} ${h.slice(4, 8)} ${h.slice(8, 12)} ${h.slice(12)}`,
      title: "Empreinte du numéro d'hexagone (5,7 millions de chiffres)",
    }),
    ` · mur ${e.mur} · étagère ${e.etagere} · volume ${e.volume} · page ${etat.p}`);
  $('numero').value = etat.p;
  $('p-premiere').disabled = $('p-precedente').disabled = etat.p === 1;
  $('p-suivante').disabled = $('p-derniere').disabled = etat.p === PAGES;
  for (const b of document.querySelectorAll('#rayons button, #copier-lien')) b.disabled = !etat.chemin;
  document.title = `Babel · ${h.slice(0, 4)} · mur ${e.mur} · étagère ${e.etagere} · vol. ${e.volume} · p. ${etat.p}`;
  dessinerPage();
}

function dessinerPage() {
  const conteneur = $('page'), debut = (etat.p - 1) * PAGE, trouve = pos => etat.places?.has(pos);
  conteneur.className = 'page ' + etat.mode;
  const lignes = etat.bib.lignes(etat.livre, etat.p).map((texte, k) => {
    const ligne = document.createElement('div');
    ligne.className = 'ligne';
    const symboles = Array.from(texte), origine = debut + k * COLONNES;
    if (etat.mode === 'grille') {
      ligne.append(...symboles.map((c, j) => {
        const s = document.createElement('span');
        s.textContent = MARQUE.test(c) ? '◌' + c : c;
        if (trouve(origine + j)) s.className = 'trouve';
        return s;
      }));
    } else if (etat.places) {
      let morceau = '', surligne = false;
      const vider = () => {
        if (!morceau) return;
        ligne.append(surligne ? Object.assign(document.createElement('mark'), { textContent: morceau }) : morceau);
        morceau = '';
      };
      symboles.forEach((c, j) => {
        if (trouve(origine + j) !== surligne) { vider(); surligne = !surligne; }
        morceau += c;
      });
      vider();
    } else {
      ligne.textContent = texte;
    }
    return ligne;
  });
  conteneur.replaceChildren(...lignes);
}

// ---- Recherche ----

function inconnus(texte) {
  return [...new Set(Array.from(texte).filter(c => c !== '\n' && c !== '\r' && !etat.bib.IDX.has(c)))];
}

function verifierTexte() {
  const liste = inconnus($('texte').value), p = $('inconnus');
  p.hidden = liste.length === 0;
  p.textContent = 'Absents de la bibliothèque (chiffres, symboles, tabulations…) : ' +
    liste.map(c => `${c.trim() || '␣'} U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(', ');
  return liste.length === 0;
}

function chercher(evenement) {
  evenement.preventDefault();
  const texte = $('texte').value;
  if (!verifierTexte()) return;
  if (!texte.replace(/[\r\n]/g, '')) return signaler('Écrivez un texte à chercher.', 'erreur');
  const borne = (id, max) => Math.min(max, Math.max(1, parseInt($(id).value, 10) || 1));
  const p = borne('r-page', PAGES), at = (p - 1) * PAGE + (borne('r-ligne', LIGNES) - 1) * COLONNES + borne('r-colonne', COLONNES) - 1;
  const places = placer(texte, at);
  if (places.at(-1)[0] >= L) return signaler('Le texte déborde de la fin du livre à cette position.', 'erreur');
  const chemin = { t: texte, at, d: 0, p };
  if (document.querySelector('input[name="remplissage"]:checked').value === 'hasard') chemin.g = graine();
  const fragment = ecrireChemin(chemin);
  if (location.hash === fragment) suivreUrl(); else location.hash = fragment;
}

// ---- Copies, téléchargements, fichier d'adresse ----

async function copier(texte, quoi) {
  try {
    await navigator.clipboard.writeText(texte);
    signaler(quoi + ' copié.');
  } catch {
    signaler('Copie refusée par le navigateur.', 'erreur');
  }
}

function telecharger(nom, contenu, type) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  Object.assign(document.createElement('a'), { href: url, download: nom }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const nomFichier = ext => {
  const e = etat.emplacement;
  return `babel-${e.hexagone}-m${e.mur}-e${e.etagere}-v${e.volume}.${ext}`;
};

function telechargerLivre() {
  const pages = [];
  for (let p = 1; p <= PAGES; p++) pages.push(`— Page ${p} —\n${etat.bib.page(etat.livre, p)}\n\n`);
  telecharger(nomFichier('txt'), pages.join(''), 'text/plain;charset=utf-8');
}

async function ouvrirAdresse(evenement) {
  const fichier = evenement.target.files[0];
  evenement.target.value = '';
  if (!fichier) return;
  signaler("Lecture de l'adresse", 'attente');
  try {
    const tampon = await fichier.arrayBuffer();
    const r = await calculer({ fichier: tampon }, [tampon]);
    Object.assign(etat, { cle: null, chemin: null, livre: r.livre, adresse: r.adresse, emplacement: r.emplacement, places: null, p: 1 });
    history.pushState(null, '', FICHIER);
    signaler("Livre ouvert depuis un fichier d'adresse : il n'a pas de lien court.");
    dessiner();
  } catch (e) {
    if (!(e instanceof Obsolete)) signaler('Erreur : ' + e.message, 'erreur');
  }
}

// ---- Démarrage ----

etat.bib = await Bibliotheque.charger(await (await fetch('alphabet_v2.txt')).text());

$('hasard').addEventListener('click', () => { location.hash = ecrireChemin({ h: graine(), d: 0, p: 1 }); });
$('recherche').addEventListener('submit', chercher);
$('texte').addEventListener('input', verifierTexte);
for (const b of document.querySelectorAll('#rayons button')) b.addEventListener('click', () => allerAuVoisin(Number(b.dataset.d)));
$('p-premiere').addEventListener('click', () => allerALaPage(1));
$('p-precedente').addEventListener('click', () => allerALaPage(etat.p - 1));
$('p-suivante').addEventListener('click', () => allerALaPage(etat.p + 1));
$('p-derniere').addEventListener('click', () => allerALaPage(PAGES));
$('numero').addEventListener('change', e => allerALaPage(parseInt(e.target.value, 10)));
for (const r of document.querySelectorAll('input[name="mode"]')) {
  r.checked = r.value === etat.mode;
  r.addEventListener('change', () => {
    etat.mode = r.value;
    try { localStorage.setItem('babel-mode', etat.mode); } catch { /* stockage bloqué */ }
    if (etat.livre) dessinerPage();
  });
}
$('copier-lien').addEventListener('click', () => copier(location.href, 'Lien'));
$('copier-page').addEventListener('click', () => etat.livre && copier(etat.bib.page(etat.livre, etat.p), 'Texte de la page'));
$('dl-livre').addEventListener('click', () => etat.livre && telechargerLivre());
$('dl-adresse').addEventListener('click', () => etat.adresse && telecharger(nomFichier('babel'), etat.bib.ecrireAdresse(etat.adresse), 'application/octet-stream'));
$('ouvrir').addEventListener('change', ouvrirAdresse);
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowLeft') allerALaPage(etat.p - 1);
  if (e.key === 'ArrowRight') allerALaPage(etat.p + 1);
});
window.addEventListener('hashchange', suivreUrl);
suivreUrl();
