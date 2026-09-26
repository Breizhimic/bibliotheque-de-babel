"""Construit l'alphabet v2 à partir de l'alphabet v1 (24 078 symboles).

L'ordre de v1 est conservé ; on retire seulement :
  1. les doublons détruits par NFC (K Kelvin, Å Ångström, grec oxia, formes hébraïques...) ;
  2. les variantes de compatibilité (NFKC) qu'aucune langue CLDR n'atteste ;
  3. les hentaigana et kana archaïques ;
  4. le supplément historique du bamoun ;
  5. les signes numériques slavons (marques englobantes) ;
  6. la partie médiévale, insulaire, égyptologique, épigraphique et maya coloniale du latin étendu-D.
Tout symbole retiré doit être non attesté dans CLDR (nb_langues_CLDR = 0).

Sorties :
  site/alphabet_v2.txt              source de vérité : un point de code hexadécimal par ligne
  alphabet_v2/symboles_v2.csv       métadonnées v1 + index v2
  alphabet_v2/retraits_v2.csv       symboles retirés et motif
  alphabet_v2/symboles_v2_seuls.txt un symbole par ligne (lecture humaine)

Usage : py -3.13 outils/construire_alphabet_v2.py
"""
import csv
import hashlib
import sys
import unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
V1_SHA256 = "e0507b6bf4d495a51f611b7d6d4356361a7f031633e7dcc353cc274891e46ad3"  # octets de symboles_seuls.txt

# Latin étendu-D (U+A720-U+A7FF) : plages retirées, bornes incluses.
LATIN_HISTORIQUE = [
    (0xA722, 0xA725, "latin égyptologique"),
    (0xA728, 0xA72F, "latin maya colonial"),
    (0xA732, 0xA778, "latin médiéval"),
    (0xA779, 0xA787, "latin insulaire/celtisant"),
    (0xA796, 0xA799, "latin médiéval"),
    (0xA7BA, 0xA7BF, "latin égyptologique"),
    (0xA7C0, 0xA7C3, "latin médiéval"),
    (0xA7D0, 0xA7D9, "latin médiéval"),
    (0xA7F5, 0xA7F7, "latin épigraphique"),
    (0xA7FB, 0xA7FF, "latin épigraphique"),
]
SLAVON_NUMERIQUE = {0x0488, 0x0489, 0xA670, 0xA671, 0xA672}


def motif_retrait(c, nb_langues):
    """Renvoie le motif de retrait du symbole c, ou None s'il est gardé."""
    cp = ord(c)
    if unicodedata.normalize("NFC", c) != c:
        return "doublon NFC"
    if unicodedata.normalize("NFKC", c) != c and nb_langues == 0:
        return "variante NFKC non attestée"
    if 0x1B000 <= cp <= 0x1B122:
        return "hentaigana ou kana archaïque"
    if 0x16800 <= cp <= 0x16A3F:
        return "bamoun historique"
    if cp in SLAVON_NUMERIQUE:
        return "signe numérique slavon"
    for debut, fin, motif in LATIN_HISTORIQUE:
        if debut <= cp <= fin:
            return motif
    return None


def empreinte(symboles):
    """SHA-256 des symboles concaténés en UTF-8 : identifie une version d'alphabet."""
    return hashlib.sha256("".join(symboles).encode("utf-8")).hexdigest()


def lire_v1():
    brut = (RACINE / "symboles_seuls.txt").read_bytes()
    if hashlib.sha256(brut).hexdigest() != V1_SHA256:
        sys.exit("symboles_seuls.txt ne correspond pas à la v1 attendue")
    symboles = brut.decode("utf-8").split("\n")
    with open(RACINE / "symboles.csv", encoding="utf-8-sig", newline="") as f:
        lignes = list(csv.reader(f, delimiter=";"))[1:]
    if [l[1] for l in lignes] != symboles:
        sys.exit("symboles.csv et symboles_seuls.txt divergent")
    return lignes


def main():
    if unicodedata.unidata_version < "14.0":
        sys.exit("Python trop ancien : Unicode >= 14 requis")
    lignes = lire_v1()
    gardes, retires = [], []
    for ligne in lignes:
        motif = motif_retrait(ligne[1], int(ligne[5]))
        if motif is None:
            gardes.append(ligne)
        elif int(ligne[5]) > 0:
            sys.exit("symbole attesté dans CLDR retiré par erreur : %s %s" % (ligne[2], motif))
        else:
            retires.append(ligne + [motif])

    symboles = [l[1] for l in gardes]
    (RACINE / "site").mkdir(exist_ok=True)
    sortie = RACINE / "alphabet_v2"
    sortie.mkdir(exist_ok=True)
    with open(RACINE / "site" / "alphabet_v2.txt", "w", encoding="ascii", newline="\n") as f:
        f.write("".join("%04X\n" % ord(c) for c in symboles))
    with open(sortie / "symboles_v2_seuls.txt", "w", encoding="utf-8", newline="") as f:
        f.write("\n".join(symboles))
    with open(sortie / "symboles_v2.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\r\n")
        w.writerow(["index_v2", "index_v1", "symbole", "code_unicode", "script", "source",
                    "nb_langues_CLDR", "exemples_de_langues"])
        for i, l in enumerate(gardes):
            w.writerow([i] + l)
    with open(sortie / "retraits_v2.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\r\n")
        w.writerow(["index_v1", "symbole", "code_unicode", "script", "motif"])
        for l in retires:
            w.writerow([l[0], l[1], l[2], l[3], l[7]])

    motifs = {}
    for l in retires:
        motifs[l[7]] = motifs.get(l[7], 0) + 1
    for motif, n in sorted(motifs.items(), key=lambda kv: -kv[1]):
        print("%5d  %s" % (n, motif))
    print("retirés %d, N v2 = %d, empreinte %s" % (len(retires), len(symboles), empreinte(symboles)))


if __name__ == "__main__":
    main()
