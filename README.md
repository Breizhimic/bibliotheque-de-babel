# Bibliothèque de Babel étendue — alphabet v2

La bibliothèque de Borges (410 pages de 40 lignes de 80 caractères par livre), réécrite avec un alphabet de
**22 984 symboles** couvrant les écritures des langues vivantes. Chaque livre existe exactement une fois ; rien n'est
stocké : un livre se calcule à partir de son adresse, et l'adresse d'un texte se calcule à partir du texte.

## Utiliser

Site en local (Node ≥ 20) :

```bash
node outils/serveur.mjs
```

puis ouvrir <http://localhost:8741/>. Le site est statique : le dossier `site/` se publie tel quel.

Ligne de commande (Python ≥ 3.11, sans dépendance) :

```bash
py -3.13 babel.py hasard
py -3.13 babel.py cherche "Il y a une bibliothèque" --page 3 --ligne 2 --colonne 5
py -3.13 babel.py lien "#v=2&t=Bonjour&d=1&p=2"
py -3.13 babel.py adresse "#v=2&t=Bonjour" bonjour.babel
py -3.13 babel.py ouvrir bonjour.babel --page 1
```

Tests :

```bash
py -3.13 -m unittest discover -s tests
node --test
```

## Fichiers

| Chemin | Rôle |
|---|---|
| `site/alphabet_v2.txt` | **Source de vérité** : un point de code hexadécimal par ligne. Son ordre fixe toutes les adresses. |
| `babel.py` | Moteur Python et ligne de commande. |
| `site/babel.js` | Même moteur en JavaScript (module ES sans dépendance). |
| `site/index.html`, `app.js`, `style.css`, `travailleur.js` | Interface web ; les livres se calculent dans un Web Worker. |
| `site/polices/` | Polices hébergées pour les symboles absents de Google Fonts, avec leurs licences. |
| `outils/construire_alphabet_v2.py` | Dérive l'alphabet v2 de la v1 (filtres ci-dessous). |
| `outils/generer_keccak.mjs` | Régénère la permutation Keccak déroulée de `site/babel.js`. |
| `outils/serveur.mjs` | Serveur statique local. |
| `alphabet_v2/` | Versions lisibles : CSV des symboles gardés, CSV des retraits avec leur motif. |
| `tests/` | Tests Python et Node ; `vecteurs.json` garantit que Python et JS donnent les mêmes livres. |
| `symboles*.txt`, `symboles.csv`, `langues_et_alphabets.txt` | Alphabet v1 (24 078 symboles), inchangé. |

## Alphabet v2

Empreinte : SHA-256 des symboles concaténés en UTF-8 =
`fc1ba0f125dc08ceb64b39629e3489a05ffb9c25091093dd2882b7e7cfaae619`.

La v2 garde l'ordre de la v1 et retire 1 094 symboles, tous absents des données CLDR :

| Retrait | Nombre |
|---|---:|
| Supplément historique du bamoun | 569 |
| Hentaigana et kana archaïques | 291 |
| Doublons détruits par NFC (K Kelvin, Å Ångström, Ω ohm, grec oxia, formes hébraïques, nukta indiens, tibétain) | 96 |
| Latin étendu-D médiéval, insulaire, égyptologique, maya colonial, épigraphique | 129 |
| Signes numériques slavons | 5 |
| Variantes NFKC non attestées (ŉ ẛ ϓ ϔ) | 4 |

Conséquences :

- Aucun symbole ne change sous NFC. Environ 6 % des pages aléatoires restent modifiables par NFC, car une lettre
  suivie d'un accent combinant peut fusionner avec lui.
- Les symboles comptent au point de code près. « é » (U+00E9) et « e » suivi de U+0301 mènent à deux livres
  différents ; la recherche ne normalise jamais le texte et propose la variante NFC ou NFD quand elle existe.
- Les homoglyphes (A latin, Α grec, А cyrillique) restent distincts : ce sont des lettres de langues différentes.

Chiffres : 2,54 × 10^5 722 190 livres ; 14,49 bits par symbole ; 2,38 Mo d'information par livre.

## Spécification (version 2)

Un livre est une suite de L = 1 312 000 indices dans l'alphabet (page p, ligne l, colonne c à la position
3200·(p−1) + 80·(l−1) + (c−1)). Son adresse X est un entier de [0, N^L), stocké comme L chiffres en base N,
poids faibles d'abord.

- **Permutation adresse → livre** : réseau de Feistel à 6 tours sur les deux moitiés (A, B) de 656 000 symboles :
  (A, B) → (B, A + F(r, B)), addition modulo N symbole par symbole.
  F(r, B) = SHAKE-256(`babel-v2/` ‖ `F` ‖ octet r ‖ B en uint16 petit-boutien), lu en uint32 petit-boutiens, modulo N.
- **Livre au hasard** : adresse = SHAKE-256(`babel-v2/H` ‖ graine) lue en uint32, modulo N.
- **Livre d'un texte** : le texte s'écrit à partir d'une position. Un saut de ligne mène au début de la ligne suivante,
  sauf juste après une ligne pleine : copier une page puis la chercher redonne la même page. Le reste du livre contient
  des espaces, ou SHAKE-256(`babel-v2/R` ‖ graine) modulo N.
- **Rangement** : X = 640·hexagone + 160·(mur−1) + 32·(étagère−1) + (volume−1). L'hexagone est affiché par une
  empreinte : les 8 premiers octets de SHAKE-256(`babel-v2/X` ‖ adresse du volume 1 de l'hexagone en uint16).
- **Chemin (fragment d'URL)** : `#v=2&h=<graine>` ou `#v=2&t=<texte>&at=<position>[&g=<graine>]`, puis
  `&d=<décalage>` (livre d'adresse X + d) et `&p=<page>`. Graines en base64url, texte encodé comme
  `encodeURIComponent`.
- **Fichier d'adresse** : en-tête `BABEL v2 fc1ba0f125dc08ce\n`, puis chaque paire de chiffres x0 + N·x1 (< 2^30)
  sur 30 bits, poids faibles d'abord : 2 460 026 octets.

L'adresse d'un livre pèse autant que le livre : aucune URL ne peut la contenir. L'URL décrit donc le chemin
(hasard, recherche, voisinage). Seul un livre connu uniquement par son adresse exige le fichier.

## Polices

Google Fonts fournit les polices Noto de presque toutes les écritures. Pour les symboles qu'il ne couvre pas,
le site héberge trois polices libres dans `site/polices/`, chacune avec sa licence (SIL Open Font License 1.1) :

| Fichier | Symboles | Source |
|---|---|---|
| `Kanchenjunga-Regular.ttf` (51 Ko, non modifiée) | Kirat Rai | SIL, [font-kanchenjunga](https://github.com/silnrsi/font-kanchenjunga) v2.001 |
| `NotoSansGurungKhema-Regular.ttf` (10 Ko, non modifiée) | Gurung Khema | version alpha 1.005 de Noto Sans Gurung Khema, [rossea/GurungKhema](https://github.com/rossea/GurungKhema) |
| `unifont-babel-smp.woff2`, `unifont-babel-bmp.woff2` (6 Ko) | Garay, Ol Onal, Tulu-Tigalari et 34 symboles récents (kana taïwanais, petits kana, bopomofo étendu, arabe, cyrillique) | sous-ensembles de [GNU Unifont](https://unifoundry.com/unifont/) 18.0.01 |

Aucune police Noto publiée n'existe encore pour Garay, Ol Onal et Tulu-Tigalari : Unifont, au dessin pixelisé,
sert en attendant. Avec ces polices, les 22 984 symboles s'affichent sans carré vide dans Chromium sous Windows ;
les autres systèmes n'ont pas été vérifiés.

## Limites connues

- 7 symboles sont invisibles par nature (U+034F, U+17B4, U+17B5, sélecteurs de variante mongols U+180B à U+180F) :
  une page qui en contient ressemble à une page sans eux. Candidats au retrait dans une v3.
- Han, hangul et yi forment 57 % de l'alphabet : une page au hasard est surtout en CJK.
- Toute modification de l'alphabet ou de la spécification change toutes les adresses : il faudra alors passer à `v=3`
  et régénérer `tests/vecteurs.json` (`py -3.13 tests/generer_vecteurs.py`).

## Publier

Le dossier `site/` suffit. Sur Netlify, déposer le dossier `site/` dans l'interface (« Deploy manually »). Sur
GitHub Pages, publier `site/` avec une action `actions/upload-pages-artifact` (le mode « depuis une branche »
n'accepte que la racine ou `docs/`). Les polices viennent de Google Fonts et de `site/polices/`.
