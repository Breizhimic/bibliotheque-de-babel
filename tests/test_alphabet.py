"""Tests de l'alphabet v2 : py -3.13 -m unittest discover -s tests"""
import csv
import hashlib
import unicodedata
import unittest
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
N_V2 = 22984
EMPREINTE_V2 = "fc1ba0f125dc08ceb64b39629e3489a05ffb9c25091093dd2882b7e7cfaae619"
RETRAITS_ATTENDUS = {
    "doublon NFC": 96,
    "variante NFKC non attestée": 4,
    "hentaigana ou kana archaïque": 291,
    "bamoun historique": 569,
    "signe numérique slavon": 5,
    "latin médiéval": 88,
    "latin insulaire/celtisant": 15,
    "latin égyptologique": 10,
    "latin maya colonial": 8,
    "latin épigraphique": 8,
}


def lire_csv(nom):
    with open(RACINE / "alphabet_v2" / nom, encoding="utf-8-sig", newline="") as f:
        return list(csv.reader(f, delimiter=";"))[1:]


class TestAlphabetV2(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        texte = (RACINE / "site" / "alphabet_v2.txt").read_text(encoding="ascii")
        cls.sym = [chr(int(h, 16)) for h in texte.split()]
        cls.v1 = (RACINE / "symboles_seuls.txt").read_text(encoding="utf-8").split("\n")

    def test_taille_et_empreinte(self):
        self.assertEqual(len(self.sym), N_V2)
        self.assertEqual(len(set(self.sym)), N_V2)
        self.assertEqual(hashlib.sha256("".join(self.sym).encode("utf-8")).hexdigest(), EMPREINTE_V2)

    def test_stable_sous_nfc(self):
        instables = [c for c in self.sym if unicodedata.normalize("NFC", c) != c]
        self.assertEqual(instables, [])

    def test_sous_suite_ordonnee_de_v1(self):
        pos = {c: i for i, c in enumerate(self.v1)}
        indices = [pos[c] for c in self.sym]
        self.assertEqual(indices, sorted(indices))

    def test_retraits_complementaires(self):
        retraits = lire_csv("retraits_v2.csv")
        self.assertEqual(len(retraits) + N_V2, len(self.v1))
        self.assertEqual(set(r[1] for r in retraits) | set(self.sym), set(self.v1))
        compte = {}
        for r in retraits:
            compte[r[4]] = compte.get(r[4], 0) + 1
        self.assertEqual(compte, RETRAITS_ATTENDUS)

    def test_csv_coherent(self):
        lignes = lire_csv("symboles_v2.csv")
        self.assertEqual([l[2] for l in lignes], self.sym)
        self.assertEqual([int(l[0]) for l in lignes], list(range(N_V2)))
        seuls = (RACINE / "alphabet_v2" / "symboles_v2_seuls.txt").read_text(encoding="utf-8").split("\n")
        self.assertEqual(seuls, self.sym)

    def test_espace_unique(self):
        self.assertEqual([c for c in self.sym if unicodedata.category(c) == "Zs"], [" "])


if __name__ == "__main__":
    unittest.main()
