// Calcule les livres hors du fil principal (0,3 à 0,8 s par livre) pour garder la page réactive.
import { Bibliotheque, lireChemin } from './babel.js';

const bibliotheque = fetch('alphabet_v2.txt').then(r => r.text()).then(Bibliotheque.charger);

onmessage = async ({ data }) => {
  try {
    const bib = await bibliotheque;
    let adresse, livre;
    if (data.fichier) {
      adresse = bib.lireAdresse(new Uint8Array(data.fichier));
      livre = bib.permuter(adresse);
    } else {
      ({ adresse, livre } = bib.resoudre(lireChemin(data.fragment)));
    }
    const emplacement = bib.emplacement(adresse);
    postMessage({ id: data.id, adresse, livre, emplacement }, [adresse.buffer, livre.buffer]);
  } catch (e) {
    postMessage({ id: data.id, erreur: e.message });
  }
};
