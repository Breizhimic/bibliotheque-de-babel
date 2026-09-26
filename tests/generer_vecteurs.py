"""Écrit tests/vecteurs.json : résultats de référence de babel.py, rejoués par les tests JS.

À relancer seulement si la spécification change (les adresses changent alors toutes) :
    py -3.13 tests/generer_vecteurs.py
"""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import babel  # noqa: E402

CHEMINS = [
    "#v=2&h=AAAAAAAAAAAAAAAAAAAAAA",
    "#v=2&h=M0ZhIGJpYmxpb3RoZXF1ZQ&d=1&p=2",
    babel.ecrire_chemin({"t": "Bonjour, le monde"}),
    babel.ecrire_chemin({"t": "Bibliothèque\n図書館 도서관 𞤀𞤁 (Adlam) कि ɔ́", "at": 3217,
                         "g": b"graine de test", "p": 2}),
    babel.ecrire_chemin({"t": "ἀρχή", "at": 1311996, "d": -640, "p": 410}),
]


def empreinte(valeurs):
    return hashlib.shake_256(babel._uint16(valeurs)).hexdigest(16)


def main():
    cas = []
    for fragment in CHEMINS:
        chemin = babel.lire_chemin(fragment)
        assert babel.ecrire_chemin(chemin) == fragment, fragment
        adresse, livre = babel.resoudre(chemin)
        cas.append({
            "chemin": fragment,
            "livre": empreinte(livre),
            "adresse": empreinte(adresse),
            "emplacement": babel.emplacement(adresse),
            "page": babel.page(livre, chemin["p"]),
            "fichier_sha256": hashlib.sha256(babel.ecrire_adresse(adresse)).hexdigest(),
        })
        print(fragment, cas[-1]["emplacement"])
    flux = {"etiquette": "F\u0000", "donnees": "abc", "n": 40,
            "mots": list(babel._flux(b"F\x00", b"abc", 40))}
    sortie = {"alphabet": babel.EMPREINTE_ALPHABET, "N": babel.N, "flux": flux, "cas": cas}
    chemin = Path(__file__).resolve().parent / "vecteurs.json"
    chemin.write_text(json.dumps(sortie, ensure_ascii=False, indent=1), encoding="utf-8")
    print("écrit", chemin)


if __name__ == "__main__":
    main()
