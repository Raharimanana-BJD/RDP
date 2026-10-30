---
name: neo-brutalisme
source: derived
character: "Néo brutalisme lisible : fond crème pointillé, cartes blanches cerclées de noir, ombres pleines décalées, couleurs franches et titres en capitales. Le graphe reste le héros ; le style lui donne du relief sans le surcharger."
tokens: "les valeurs vivent dans src/index.css (:root) ; Cytoscape dessine sur un canvas, donc GrapheReseau.tsx et Analyse.tsx reprennent les mêmes hex en constantes"
contrast: "texte #111 sur crème 17.6:1 ; texte doux #4b4b4b sur crème 8.1:1 ; noir sur jaune #ffd23f 13.1:1 ; noir sur vert #22c55e 8.3:1 ; noir sur orange #ff8a3d 8.1:1 ; noir sur rouge #ff4d4d 5.8:1 ; noir sur rose #ff90e8 9.4:1"
---

## Build mandate
Chaque écran est une surface complète : en tête, panneaux titrés, états vides rédigés, légende. Jamais un contrôle isolé sur un fond vide.

## Character & direction
- Traits noirs de 3px (2px pour les petits éléments), rayon 4px, ombre pleine `5px 5px 0` sans flou.
- Un accent : jaune `#ffd23f` (en tête, titres de panneaux, bouton Recentrer, marquage courant). Le rose `#ff90e8` marque seulement le scénario actif.
- Police unique Space Grotesk (paquet local `@fontsource-variable`, marche hors ligne), monospace système pour vecteurs et matrices.
- Mouvement minimal : les boutons se soulèvent au survol et s'enfoncent au clic (80ms), coupé par `prefers-reduced-motion`.

## Composition patterns
En tête jaune pleine largeur avec onglets à droite. Simulation : graphe à gauche (collant), colonne de panneaux à droite, qui passe en une colonne sous 1100px. Analyse : panneaux empilés.

## Component & usage rules
- Panneau : carte blanche, trait, ombre ; titre `h2` en étiquette jaune cerclée.
- Les couleurs d'état gardent leur sens partout (graphe, légende, boutons) : vert franchissable, orange conflit, jaune en cours de tir, rouge dernière tirée. Texte toujours noir sur ces fonds.
- Couleurs des lignes A, B, A+B (bleu, violet, sarcelle) : seulement pour les bords des places.
- Désactivé : opacité réduite et pas d'ombre.

## Responsive & accessibility direction
Contour de focus noir 3px décalé. Cases et curseurs en `accent-color` noir.
