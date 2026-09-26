"""Bibliothèque de Babel étendue, version livre entier (alphabet v2, 22 984 symboles).

Chaque livre (410 pages x 40 lignes x 80 symboles = 1 312 000 symboles) existe une seule fois.
Son adresse X est un entier de [0, N^L), stocké comme L chiffres en base N, poids faibles d'abord.
Livre et adresse sont reliés par un réseau de Feistel à 6 tours sur les deux moitiés du livre :
    (A, B) -> (B, A + F(r, B))   addition modulo N, symbole par symbole ;
    F(r, B) = SHAKE-256(domaine | "F" | r | B en uint16) lu en uint32, puis modulo N.
Rangement : X = 640 x hexagone + 160 x (mur - 1) + 32 x (étagère - 1) + (volume - 1).

Une URL ne contient pas l'adresse (2,39 Mo, incompressible) mais le chemin pour y arriver :
    #v=2&h=<graine>             livre au hasard
    #v=2&t=<texte>&at=<pos>     livre contenant le texte ; ailleurs des espaces,
                                ou le hasard avec &g=<graine>
    &d=<décalage>               livre voisin : adresse + d
    &p=<page>                   page affichée
La même spécification est implémentée dans site/babel.js ; tests/vecteurs.json garantit l'accord.

Usage : py babel.py hasard | cherche TEXTE | lien CHEMIN | adresse CHEMIN FICHIER | ouvrir FICHIER
"""
import argparse
import base64
import hashlib
import re
import secrets
import sys
import time
import unicodedata
from array import array
from pathlib import Path
from urllib.parse import quote, unquote

PAGES, LIGNES, COLONNES = 410, 40, 80
PAGE = LIGNES * COLONNES               # 3 200 symboles
L = PAGES * PAGE                       # 1 312 000 symboles par livre
MOITIE = L // 2
TOURS = 6
VOLUMES, ETAGERES, MURS = 32, 5, 4
PAR_HEXAGONE = VOLUMES * ETAGERES * MURS
DECALAGE_MAX = 10 ** 15                # reste exact en double précision côté JS
DOMAINE = b"babel-v2/"
VERSION = "2"
EMPREINTE_ALPHABET = "fc1ba0f125dc08ceb64b39629e3489a05ffb9c25091093dd2882b7e7cfaae619"
CHEMIN_ALPHABET = Path(__file__).resolve().parent / "site" / "alphabet_v2.txt"

U32 = next(t for t in "IL" if array(t).itemsize == 4)
GROS_BOUTIEN = sys.byteorder == "big"
ENTIER = re.compile(r"-?[0-9]{1,16}")
BASE64URL = re.compile(r"[A-Za-z0-9_-]{2,86}")


def charger_alphabet(chemin=CHEMIN_ALPHABET):
    symboles = [chr(int(h, 16)) for h in Path(chemin).read_text(encoding="ascii").split()]
    if hashlib.sha256("".join(symboles).encode("utf-8")).hexdigest() != EMPREINTE_ALPHABET:
        raise ValueError("alphabet inattendu : empreinte SHA-256 différente de la v2")
    return symboles


SYM = charger_alphabet()
N = len(SYM)
IDX = {c: i for i, c in enumerate(SYM)}
ESPACE = IDX[" "]
ENTETE_ADRESSE = b"BABEL v2 " + EMPREINTE_ALPHABET[:16].encode("ascii") + b"\n"


def _uint16(valeurs):
    a = array("H", valeurs)
    if GROS_BOUTIEN:
        a.byteswap()
    return a.tobytes()


def _flux(etiquette, donnees, n):
    """n entiers de 32 bits (petit-boutiens) tirés de SHAKE-256(domaine | étiquette | données)."""
    a = array(U32)
    a.frombytes(hashlib.shake_256(DOMAINE + etiquette + donnees).digest(4 * n))
    if GROS_BOUTIEN:
        a.byteswap()
    return a


def _f(tour, moitie):
    return _flux(b"F" + bytes([tour]), _uint16(moitie), MOITIE)


def permuter(adresse):
    """Adresse (L chiffres en base N) -> livre (L indices de symboles)."""
    a, b = list(adresse[:MOITIE]), list(adresse[MOITIE:])
    for r in range(TOURS):
        a, b = b, [(x + w) % N for x, w in zip(a, _f(r, b))]
    return a + b


def inverser(livre):
    """Livre -> adresse : inverse exact de permuter."""
    a, b = list(livre[:MOITIE]), list(livre[MOITIE:])
    for r in reversed(range(TOURS)):
        a, b = [(y - w) % N for y, w in zip(b, _f(r, a))], a
    return a + b


def adresse_hasard(graine):
    return [w % N for w in _flux(b"H", graine, L)]


def remplissage(graine=None):
    """Livre de fond : espaces, ou symboles tirés de la graine."""
    if graine is None:
        return [ESPACE] * L
    return [w % N for w in _flux(b"R", graine, L)]


def livre_depuis_texte(texte, debut=0, graine=None):
    """Livre où le texte commence à la position debut (0 = page 1, ligne 1, colonne 1).

    Un saut de ligne mène au début de la ligne suivante, sauf juste après une ligne remplie
    jusqu'au bout : copier une page (40 lignes de 80) puis la chercher redonne la même page.
    """
    texte = texte.replace("\r\n", "\n").replace("\r", "\n")
    inconnus = sorted({c for c in texte if c != "\n" and c not in IDX})
    if inconnus:
        raise ValueError("hors alphabet : " + " ".join("%s (U+%04X)" % (c, ord(c)) for c in inconnus))
    if not 0 <= debut < L:
        raise ValueError("position hors du livre")
    livre = remplissage(graine)
    pos, ligne_pleine = debut, False
    for c in texte:
        if c == "\n":
            if not ligne_pleine:
                pos = (pos // COLONNES + 1) * COLONNES
            ligne_pleine = False
            continue
        if pos >= L:
            raise ValueError("texte trop long pour tenir dans le livre")
        livre[pos] = IDX[c]
        pos += 1
        ligne_pleine = pos % COLONNES == 0
    return livre


def decaler(adresse, d):
    """Adresse + d modulo N^L (d entier relatif)."""
    x = list(adresse)
    i, retenue = 0, d
    while retenue and i < L:
        retenue, x[i] = divmod(x[i] + retenue, N)
        i += 1
    return x


def emplacement(adresse):
    """Mur, étagère, volume (à partir de 1) et empreinte courte de l'hexagone."""
    reste = 0
    for x in reversed(adresse):
        reste = (reste * N + x) % PAR_HEXAGONE
    premier = decaler(adresse, -reste)  # adresse du volume 1 du mur 1 de cet hexagone
    return {
        "hexagone": hashlib.shake_256(DOMAINE + b"X" + _uint16(premier)).hexdigest(8),
        "mur": reste // (ETAGERES * VOLUMES) + 1,
        "etagere": reste // VOLUMES % ETAGERES + 1,
        "volume": reste % VOLUMES + 1,
    }


def page(livre, numero):
    """Page numero (1 à 410) : 40 lignes de 80 symboles séparées par des sauts de ligne."""
    debut = (numero - 1) * PAGE
    return "\n".join("".join(SYM[i] for i in livre[debut + k * COLONNES:debut + (k + 1) * COLONNES])
                     for k in range(LIGNES))


def _vers_b64(octets):
    return base64.urlsafe_b64encode(octets).rstrip(b"=").decode("ascii")


def _depuis_b64(texte):
    if not BASE64URL.fullmatch(texte) or len(texte) % 4 == 1:
        raise ValueError("graine invalide")
    return base64.urlsafe_b64decode(texte + "=" * (-len(texte) % 4))


def _entier(texte, nom):
    if not ENTIER.fullmatch(texte):
        raise ValueError("%s invalide" % nom)
    return int(texte)


def lire_chemin(fragment):
    """'#v=2&h=...' -> dict ; lève ValueError si le chemin est invalide."""
    champs = {}
    for morceau in fragment.lstrip("#").split("&"):
        if morceau:
            cle, _, valeur = morceau.partition("=")
            champs[cle] = unquote(valeur)
    if champs.get("v") != VERSION:
        raise ValueError("version absente ou inconnue (v=2 attendu)")
    if ("h" in champs) == ("t" in champs):
        raise ValueError("il faut soit h (hasard), soit t (texte)")
    chemin = {"d": _entier(champs.get("d", "0"), "décalage"), "p": _entier(champs.get("p", "1"), "page")}
    if abs(chemin["d"]) > DECALAGE_MAX:
        raise ValueError("décalage trop grand")
    if not 1 <= chemin["p"] <= PAGES:
        raise ValueError("page hors du livre")
    if "h" in champs:
        chemin["h"] = _depuis_b64(champs["h"])
    else:
        chemin["t"] = champs["t"]
        chemin["at"] = _entier(champs.get("at", "0"), "position")
        if not 0 <= chemin["at"] < L:
            raise ValueError("position hors du livre")
        if "g" in champs:
            chemin["g"] = _depuis_b64(champs["g"])
    return chemin


def ecrire_chemin(chemin):
    """dict -> '#v=2&...' (forme canonique, identique côté JS)."""
    morceaux = ["v=" + VERSION]
    if "h" in chemin:
        morceaux.append("h=" + _vers_b64(chemin["h"]))
    else:
        morceaux.append("t=" + quote(chemin["t"], safe="!*'()"))
        if chemin.get("at"):
            morceaux.append("at=%d" % chemin["at"])
        if chemin.get("g") is not None:
            morceaux.append("g=" + _vers_b64(chemin["g"]))
    if chemin.get("d"):
        morceaux.append("d=%d" % chemin["d"])
    if chemin.get("p", 1) != 1:
        morceaux.append("p=%d" % chemin["p"])
    return "#" + "&".join(morceaux)


def resoudre(chemin):
    """Chemin -> (adresse, livre)."""
    if "h" in chemin:
        adresse = decaler(adresse_hasard(chemin["h"]), chemin["d"])
        return adresse, permuter(adresse)
    livre = livre_depuis_texte(chemin["t"], chemin["at"], chemin.get("g"))
    adresse = inverser(livre)
    if chemin["d"]:
        adresse = decaler(adresse, chemin["d"])
        livre = permuter(adresse)
    return adresse, livre


def ecrire_adresse(adresse):
    """Adresse -> fichier : en-tête, puis chaque paire de chiffres x0 + N*x1 (< 2^30) sur 30 bits,
    poids faibles d'abord (1 312 000 chiffres -> 2 460 000 octets)."""
    corps = bytearray()
    for k in range(0, L, 8):  # 4 paires = 120 bits = 15 octets
        v = 0
        for j in range(4):
            v |= (adresse[k + 2 * j] + N * adresse[k + 2 * j + 1]) << (30 * j)
        corps += v.to_bytes(15, "little")
    return ENTETE_ADRESSE + bytes(corps)


def lire_adresse(octets):
    if not octets.startswith(ENTETE_ADRESSE) or len(octets) != len(ENTETE_ADRESSE) + L // 8 * 15:
        raise ValueError("fichier d'adresse invalide ou d'une autre version")
    corps = octets[len(ENTETE_ADRESSE):]
    adresse = []
    for k in range(0, len(corps), 15):
        v = int.from_bytes(corps[k:k + 15], "little")
        for _ in range(4):
            paire, v = v & 0x3FFFFFFF, v >> 30
            if paire >= N * N:
                raise ValueError("fichier d'adresse corrompu")
            adresse += (paire % N, paire // N)
    return adresse


def decrire(adresse):
    e = emplacement(adresse)
    h = e["hexagone"]
    return "Hexagone %s %s %s %s · mur %d · étagère %d · volume %d" % (
        h[:4], h[4:8], h[8:12], h[12:], e["mur"], e["etagere"], e["volume"])


def _afficher(adresse, livre, numero, chemin=None, debut=None):
    if chemin is not None:
        print("Chemin   :", ecrire_chemin(chemin))
    print(decrire(adresse))
    print("Page %d/%d%s" % (numero, PAGES, "" if debut is None else
                            ", ligne %d, colonne %d" % (debut % PAGE // COLONNES + 1, debut % COLONNES + 1)))
    print(page(livre, numero))


def main(argv=None):
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Bibliothèque de Babel, alphabet v2 (%d symboles)" % N)
    sous = p.add_subparsers(dest="commande", required=True)
    s = sous.add_parser("hasard", help="livre au hasard")
    s.add_argument("--page", type=int, default=1)
    s = sous.add_parser("cherche", help="livre contenant un texte")
    s.add_argument("texte", help="texte à chercher ; - pour lire l'entrée standard")
    s.add_argument("--page", type=int, default=1)
    s.add_argument("--ligne", type=int, default=1)
    s.add_argument("--colonne", type=int, default=1)
    s.add_argument("--hasard", action="store_true", help="entourer le texte de hasard plutôt que d'espaces")
    s = sous.add_parser("lien", help="ouvrir un chemin (#v=2&...)")
    s.add_argument("chemin")
    s.add_argument("--page", type=int)
    s = sous.add_parser("adresse", help="écrire l'adresse complète d'un chemin dans un fichier")
    s.add_argument("chemin")
    s.add_argument("fichier")
    s = sous.add_parser("ouvrir", help="ouvrir un livre depuis un fichier d'adresse")
    s.add_argument("fichier")
    s.add_argument("--page", type=int, default=1)
    a = p.parse_args(argv)

    t0 = time.perf_counter()
    try:
        if a.commande == "hasard":
            chemin = {"h": secrets.token_bytes(16), "d": 0, "p": a.page}
            adresse, livre = resoudre(chemin)
            _afficher(adresse, livre, a.page, chemin)
        elif a.commande == "cherche":
            texte = sys.stdin.read() if a.texte == "-" else a.texte
            debut = (a.page - 1) * PAGE + (a.ligne - 1) * COLONNES + a.colonne - 1
            if not (1 <= a.page <= PAGES and 1 <= a.ligne <= LIGNES and 1 <= a.colonne <= COLONNES):
                raise ValueError("position hors du livre")
            chemin = {"t": texte, "at": debut, "d": 0, "p": a.page}
            if a.hasard:
                chemin["g"] = secrets.token_bytes(16)
            adresse, livre = resoudre(chemin)
            _afficher(adresse, livre, a.page, chemin, debut)
            for forme in ("NFC", "NFD"):
                variante = unicodedata.normalize(forme, texte)
                if variante != texte and all(c in IDX or c == "\n" for c in variante):
                    print("Variante %s (autre livre, même aspect) : %s" % (forme, ecrire_chemin(dict(chemin, t=variante))))
        elif a.commande == "lien":
            chemin = lire_chemin(a.chemin)
            if a.page:
                chemin["p"] = a.page
            adresse, livre = resoudre(chemin)
            _afficher(adresse, livre, chemin["p"], chemin)
        elif a.commande == "adresse":
            adresse, _ = resoudre(lire_chemin(a.chemin))
            Path(a.fichier).write_bytes(ecrire_adresse(adresse))
            print(decrire(adresse))
            print("Adresse écrite dans %s" % a.fichier)
        elif a.commande == "ouvrir":
            adresse = lire_adresse(Path(a.fichier).read_bytes())
            _afficher(adresse, permuter(adresse), a.page)
    except ValueError as e:
        sys.exit("Erreur : %s" % e)
    print("(%.2f s)" % (time.perf_counter() - t0), file=sys.stderr)


if __name__ == "__main__":
    main()
