"""Tests du moteur Python : py -3.13 -m unittest discover -s tests"""
import hashlib
import json
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import babel  # noqa: E402

VECTEURS = json.loads((Path(__file__).resolve().parent / "vecteurs.json").read_text(encoding="utf-8"))


class TestBabel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        rng = random.Random(42)
        cls.adresse = [rng.randrange(babel.N) for _ in range(babel.L)]
        cls.livre = babel.permuter(cls.adresse)

    def test_bijection(self):
        self.assertEqual(babel.inverser(self.livre), self.adresse)

    def test_voisins_sans_ressemblance(self):
        voisin = babel.permuter(babel.decaler(self.adresse, 1))
        communs = sum(x == y for x, y in zip(self.livre, voisin))
        self.assertLess(communs, 5 * babel.L // babel.N)  # hasard pur : L/N = 57 en moyenne

    def test_rangement(self):
        e = babel.emplacement(self.adresse)
        reste = (e["mur"] - 1) * 160 + (e["etagere"] - 1) * 32 + e["volume"] - 1
        premier = babel.decaler(self.adresse, -reste)  # mur 1, étagère 1, volume 1
        attendus = {0: (1, 1, 1), 1: (1, 1, 2), 31: (1, 1, 32), 32: (1, 2, 1), 160: (2, 1, 1), 639: (4, 5, 32)}
        for k, (mur, etagere, volume) in attendus.items():
            v = babel.emplacement(babel.decaler(premier, k))
            self.assertEqual((v["hexagone"], v["mur"], v["etagere"], v["volume"]), (e["hexagone"], mur, etagere, volume))
        suivant = babel.emplacement(babel.decaler(premier, babel.PAR_HEXAGONE))
        self.assertNotEqual(suivant["hexagone"], e["hexagone"])
        self.assertEqual((suivant["mur"], suivant["etagere"], suivant["volume"]), (1, 1, 1))
        self.assertEqual(babel.decaler(babel.decaler(self.adresse, -12345), 12345), self.adresse)

    def test_debordement_modulo(self):
        haut = [babel.N - 1] * babel.L
        self.assertEqual(babel.decaler(haut, 1), [0] * babel.L)
        self.assertEqual(babel.decaler([0] * babel.L, -1), haut)

    def test_copier_chercher_une_page(self):
        texte = babel.page(self.livre, 5)
        trouve = babel.livre_depuis_texte(texte, 4 * babel.PAGE)
        self.assertEqual(babel.page(trouve, 5), texte)
        self.assertEqual(babel.page(trouve, 4), babel.page([babel.ESPACE] * babel.L, 1))

    def test_sauts_de_ligne(self):
        livre = babel.livre_depuis_texte("ab\r\n\ncd", 78)
        s = babel.SYM
        self.assertEqual(s[livre[78]] + s[livre[79]], "ab")
        self.assertEqual(s[livre[160]] + s[livre[161]], "cd")  # ligne pleine, puis une ligne sautée

    def test_hors_alphabet(self):
        with self.assertRaisesRegex(ValueError, "U\\+0031"):
            babel.livre_depuis_texte("Borges 1941")
        with self.assertRaises(ValueError):
            babel.livre_depuis_texte("abc", babel.L - 2)

    def test_chemins_invalides(self):
        for fragment in ("#h=AAAA", "#v=2", "#v=2&h=AAAA&t=x", "#v=2&h=A", "#v=2&h=AA&p=411",
                         "#v=2&t=x&at=1e3", "#v=2&h=AA&d=99999999999999999"):
            with self.assertRaises(ValueError, msg=fragment):
                babel.lire_chemin(fragment)

    def test_fichier_adresse(self):
        octets = babel.ecrire_adresse(self.adresse)
        self.assertEqual(len(octets), len(babel.ENTETE_ADRESSE) + 2460000)
        self.assertEqual(babel.lire_adresse(octets), self.adresse)
        with self.assertRaises(ValueError):
            babel.lire_adresse(octets[:-1])

    def test_vecteurs_de_reference(self):
        self.assertEqual(VECTEURS["alphabet"], babel.EMPREINTE_ALPHABET)
        f = VECTEURS["flux"]
        self.assertEqual(list(babel._flux(f["etiquette"].encode("latin-1"), f["donnees"].encode(), f["n"])), f["mots"])
        for cas in VECTEURS["cas"]:
            chemin = babel.lire_chemin(cas["chemin"])
            self.assertEqual(babel.ecrire_chemin(chemin), cas["chemin"])
            adresse, livre = babel.resoudre(chemin)
            self.assertEqual(hashlib.shake_256(babel._uint16(livre)).hexdigest(16), cas["livre"])
            self.assertEqual(hashlib.shake_256(babel._uint16(adresse)).hexdigest(16), cas["adresse"])
            self.assertEqual(babel.emplacement(adresse), cas["emplacement"])
            self.assertEqual(babel.page(livre, chemin["p"]), cas["page"])
            self.assertEqual(hashlib.sha256(babel.ecrire_adresse(adresse)).hexdigest(), cas["fichier_sha256"])


if __name__ == "__main__":
    unittest.main()
