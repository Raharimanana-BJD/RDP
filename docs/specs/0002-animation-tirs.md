# 0002. Animation des tirs par jetons voyageurs sur le graphe Cytoscape

**Date**: 2026-10-29
**Status**: In Progress

## Summary

Chaque tir est animé sur le graphe : les jetons quittent les places d'entrée en glissant le long des arcs, la barre de la transition s'allume en jaune, puis de nouveaux jetons partent vers les places de sortie. Le tir lui même est appliqué tout de suite (marquage, historique, panneaux); l'animation n'est qu'une couche visuelle qui rejoue `avant → apres` sur le graphe. Elle dure 700 ms pour un clic, 75 % du pas en mode séquentiel, et peut être coupée par une case « Animer les tirs ». Rien ne change dans le noyau `src/rdp/`.

## Context

Le jury doit voir le jeu des jetons, la règle de tir elle même. Aujourd'hui le graphe saute d'un marquage à l'autre : l'image SVG des places change, la transition tirée devient rouge (`derniere`), et l'œil doit reconstituer ce qui a bougé. Pour un réseau d'une dizaine de places, c'est le point faible de la démonstration.

Le code existant impose plusieurs contraintes :
- Le graphe est créé une seule fois (`GrapheReseau`) puis mis à jour par classes et données (règle de `AGENTS.md`). Les positions sont fixes (`preset`, `autoungrabify`).
- Les jetons d'une place sont dessinés par une image SVG (`imageJetons`), pas par des nœuds. Rien ne bouge aujourd'hui.
- Plusieurs arcs sont courbés : les arcs de retour en pointillés (`unbundled-bezier`, distances dans `ARCS_RETOUR`) et la paire d'arcs opposés de `t_refuser` sur `B_tiers` (boucle : le jeton est consommé puis rendu). Un trajet en ligne droite couperait à travers le dessin.
- L'état vit dans un `useReducer` (`src/state/simulation.ts`); le mode séquentiel (`useSequentiel`) déclenche un pas toutes les `vitesseMs` (200 à 2500 ms) après chaque changement de marquage. Le minuteur dépend donc du marquage, pas du graphe.
- Tous les arcs ont un poids 1.

Ne rien décider laisserait `/develop` choisir seul où vit l'état « tir en cours », comment un clic pendant l'animation est traité, et comment les jetons suivent les courbes; ce sont précisément les points où le marquage ou l'historique pourraient se corrompre.

## Requirements

**User stories**:
- En tant que présentateur, je veux voir les jetons voyager à chaque tir pour que le jury comprenne la règle de tir sans explication.
- En tant que présentateur, je veux que l'animation suive le curseur de vitesse en mode séquentiel pour garder le rythme de la démonstration.
- En tant que présentateur, je veux pouvoir couper l'animation pour répondre vite aux questions du jury.

**Acceptance criteria**:
- **AC-1**: Avec l'animation activée, chaque tir (clic sur le graphe, bouton du panneau d'état, pas d'un scénario, lecture automatique, « Pas à pas », clic sur un choix proposé) joue trois phases : (1) un jeton part de chaque place d'entrée et glisse sur son arc jusqu'à la barre, (2) la barre s'allume (classe `en-tir`, barre jaune avec halo), (3) un jeton part de la barre sur chaque arc de sortie et glisse jusqu'à sa place. Les phases durent 40 %, 20 % et 40 % de la durée totale.
- **AC-2**: Les jetons suivent le tracé réel des arcs, y compris les arcs de retour courbés en pointillés et les deux arcs opposés de `t_refuser` sur `B_tiers`.
- **AC-3**: Pendant l'animation, les places montrent le compte intermédiaire : au début de la phase 1, chaque place d'entrée perd son jeton (il est sur l'arc); chaque place de sortie ne reçoit le sien qu'à la fin de la phase 3. Un jeton n'est jamais visible deux fois (dans la place et sur l'arc). Pour `t_refuser`, `B_tiers` est vide pendant l'animation puis retrouve son jeton.
- **AC-4**: Le marquage, l'historique et les panneaux sont mis à jour au moment du tir, sans attendre l'animation. À la fin de l'animation, le graphe montre exactement le marquage de l'état (celui qu'on obtient sans animation).
- **AC-5**: La durée totale vaut 700 ms pour un tir d'origine `manuel` et `round(0,75 × vitesseMs)` pour un tir d'origine `sequentiel` (scénario, lecture, « Pas à pas », clic sur un choix proposé). La durée est lue au début de chaque animation.
- **AC-6**: Un tir déclenché pendant une animation fait sauter l'animation en cours à sa fin (jetons temporaires retirés, classes d'animation ôtées), puis le nouveau tir est appliqué et animé. Le marquage et l'historique restent justes, et aucun jeton temporaire ne reste sur le graphe.
- **AC-7**: Annuler et Réinitialiser ne sont pas animés. Déclenchés pendant une animation, ils l'arrêtent tout de suite et le graphe montre le nouvel état.
- **AC-8**: Une case « Animer les tirs », cochée par défaut, se trouve dans le panneau séquentiel à côté du curseur de vitesse. Décochée, les tirs se comportent comme aujourd'hui (changement immédiat, transition rouge). La décocher pendant une animation la termine tout de suite.
- **AC-9**: Le rouge « dernière transition tirée » (classe `derniere` sur la barre et ses arcs) n'apparaît qu'à la fin de l'animation. Pendant le trajet, l'arc emprunté s'épaissit en jaune (classe `en-cours`) : les arcs d'entrée en phase 1, les arcs de sortie en phase 3.
- **AC-10**: Les jetons temporaires ne réagissent ni au survol ni au clic. Zoomer, déplacer la vue ou cliquer « Recentrer » pendant une animation garde les jetons sur leurs arcs. Passer à l'onglet Analyse pendant une animation ne provoque pas d'erreur, et revenir à Simulation ne rejoue pas le dernier tir.

## Options considered

### Option 1: Couche visuelle sur un tir immédiat, jetons en nœuds Cytoscape temporaires

Le reducer applique le tir tout de suite. `GrapheReseau` repère la nouvelle entrée d'historique et rejoue `avant → apres` : il ajoute de petits nœuds « jeton » et les déplace à chaque image (`requestAnimationFrame`) sur la courbe de l'arc, calculée à partir des points que Cytoscape donne pour chaque arc.

**Pros**:
- La source de vérité (le marquage) ne dépend jamais d'une animation : impossible de rester bloqué dans un état « tir en cours ».
- Zoom, déplacement et recadrage marchent sans code, les jetons vivent dans les coordonnées du graphe.
- Respecte la règle « graphe créé une fois, mis à jour par classes et données ».

**Cons**:
- Les panneaux (état, historique, transitions franchissables en vert) montrent l'état d'après pendant que les jetons sont encore en route.
- Le calcul du point sur une courbe de Bezier est à écrire (petit, mais à tester).

### Option 2: Tir différé à la fin de l'animation

L'action `tirer` lance d'abord une animation; le reducer n'enregistre le tir qu'à la fin. Un état « tir en cours » bloque ou met en file les autres actions.

**Pros**:
- Graphe et panneaux restent synchronisés à tout instant.

**Cons**:
- Un nouvel état à gérer dans le reducer et dans `useSequentiel` (dont le minuteur dépend du marquage), avec ses cas d'annulation au milieu.
- Une animation interrompue (onglet changé, composant démonté) peut laisser un tir perdu : c'est exactement le « clic qui casse le marquage » que le scope interdit.

### Option 3: Calque SVG superposé au canevas Cytoscape

Les jetons sont dessinés dans un SVG posé sur le canevas, avec le même tir immédiat que l'option 1.

**Pros**:
- Liberté totale de style (dégradés, traînée).

**Cons**:
- Il faut recopier le zoom et le déplacement de Cytoscape à chaque image, et retrouver les courbes des arcs en coordonnées écran.
- Deux systèmes de dessin à garder alignés.

### Option 4: `node.animate()` intégré de Cytoscape

Même principe que l'option 1, mais le déplacement passe par l'animation de position intégrée.

**Pros**:
- Moins de code : pas de boucle d'image ni de calcul de courbe.

**Cons**:
- Trajet en ligne droite seulement : les jetons couperaient à travers les arcs de retour courbés (échoue AC-2).

## Decision

**Chosen option**: Option 1: Couche visuelle sur un tir immédiat, jetons en nœuds Cytoscape temporaires.

Le tir reste instantané dans l'état; `GrapheReseau` anime chaque nouvelle entrée d'historique avec des nœuds jetons temporaires déplacés image par image sur la courbe réelle des arcs.

## Rationale

La contrainte la plus forte du scope est qu'un clic pendant une animation ne casse ni le marquage ni l'historique. L'option 1 l'obtient par construction : l'animation ne possède aucun état métier, elle ne fait que relire `avant`, `transition` et `apres` d'une entrée d'historique déjà écrite. L'interrompre, la sauter ou la perdre (onglet changé) ne peut jamais fausser le marquage; au pire, le graphe se redessine sur l'état courant. L'option 2 donne une synchronisation parfaite mais fait entrer un état transitoire dans le reducer et dans le minuteur séquentiel, pour un gain que le jury ne verra pas.

Entre les techniques de rendu, les nœuds Cytoscape temporaires gardent un seul système de dessin, donc zoom et recadrage gratuits, et respectent la règle de `AGENTS.md` sur le graphe créé une fois. `animate()` serait plus court mais trace des droites, ce qui ruine la lisibilité sur les arcs de retour. Le calque SVG ajoute une synchronisation de vue à chaque image sans rien apporter de nécessaire.

Le décalage accepté (les panneaux montrent l'état d'après pendant 700 ms au plus) est court et cohérent : c'est l'état réel, et les transitions vertes sont cliquables tout de suite, ce qui rend le choix « finir et enchaîner » naturel.

## Feature design

**Data model sketch** (état en mémoire, aucune persistance) :
- `ActionSimulation` `tirer` gagne `origine: OrigineTir` (requis), avec `type OrigineTir = 'manuel' | 'sequentiel'` dans `src/state/simulation.ts`.
- `EntreeHistorique` gagne `origine: OrigineTir`, recopiée depuis l'action.
- `EtatSequentiel` gagne `animerTirs: boolean` (défaut `true`), ajouté au `Pick` accepté par `reglages`.
- `GrapheReseau` garde en `useRef` (pas en état React) : `dernierNumeroVu: number` et l'animation en cours `{ tir, debut, dureeMs, rafId, jetons: Collection } | null`.

**Points d'appel de `tirer`** (tous à mettre à jour) :
| Lieu | Origine |
|---|---|
| `App.tirerManuel` (clic graphe, bouton du panneau d'état), sauf quand un choix est en attente : il passe alors la main à `choisir` | `manuel` |
| `useSequentiel.unPas` (scénario, transition unique, hasard) | `sequentiel` |
| `useSequentiel.choisir` (clic sur un choix proposé) | `sequentiel` |

**Module pur `src/components/animationTir.ts`** (aucun import de React, du DOM ni de Cytoscape) :
- `DUREE_MANUELLE_MS = 700`, `PART_SEQUENTIELLE = 0.75`, `PHASES = { entree: 0.4, barre: 0.2, sortie: 0.4 }`.
- `dureeAnimation(origine, vitesseMs): number` : 700 ou `Math.round(0.75 * vitesseMs)`.
- `phaseA(ecouleMs, dureeMs): { phase: 'entree' | 'barre' | 'sortie' | 'fin'; progression: number }` : progression de 0 à 1 dans la phase, `fin` quand `ecouleMs >= dureeMs`.
- `adoucir(t)` : courbe ease in out (accélère puis freine), par exemple `t < 0.5 ? 2t² : 1 − (−2t + 2)² / 2`.
- `pointSurArc(points, t)` : `points = [source, ...controles, cible]`. Zéro point de contrôle : interpolation linéaire. Un point : Bezier quadratique `(1−t)²S + 2(1−t)tC + t²T`. Plus d'un : suivre la ligne brisée passant par les points (cas absent du réseau actuel, gardé pour ne pas planter).
- `marquageIntermediaire(transition, avant)` : `avant` moins un jeton par arc d'entrée, nouvel objet (ne modifie pas `avant`).

**Déroulé dans `GrapheReseau`** :
1. Nouvelles props : `tir: EntreeHistorique | null` (le dernier de l'historique), `vitesseMs: number`, `animer: boolean`.
2. Un effet, déclaré après l'effet de mise à jour existant, réagit à `tir`. Si `animer` et `tir.numero > dernierNumeroVu` : terminer l'animation en cours s'il y en a une, puis démarrer. Dans tous les cas, `dernierNumeroVu = tir?.numero ?? 0`. À la création du graphe, `dernierNumeroVu` prend le numéro courant (pas de rejeu au retour d'onglet).
3. Démarrage (dans un seul `cy.batch`) : lire pour chaque arc d'entrée puis de sortie `edge.sourceEndpoint()`, `edge.controlPoints() ?? []` (positions dans le repère du graphe, pas à l'écran), `edge.targetEndpoint()` (ids existants `${place}->${t}` et `${t}->${place}`); un arc dont les extrémités manquent est sauté (pas de jeton) au lieu de planter. Dessiner les places avec `marquageIntermediaire`; retirer `derniere` de la barre et des arcs; ajouter un nœud `jeton-anim` par arc d'entrée (un seul, tous les poids valent 1), d'id unique `jeton-anim-${i}`, posé sur sa source.
4. Boucle `requestAnimationFrame` : le temps écoulé (`performance.now() − debut`) donne la phase via `phaseA`, donc aucune dérive si des images sautent. Pendant les phases `entree`, `barre` et `sortie`, les images des places restent celles de `marquageIntermediaire`; les places de sortie ne reçoivent leur jeton que dans `terminer`. Phase `entree` : jetons sur les arcs d'entrée, arcs d'entrée en `en-cours`. Phase `barre` : jetons d'entrée retirés, barre en `en-tir`. Phase `sortie` : un jeton par arc de sortie, arcs de sortie en `en-cours`, `en-tir` ôtée. Phase `fin` : terminer.
5. Terminer (aussi appelé pour un saut ou une coupure) : `cancelAnimationFrame`, retirer les nœuds `jeton-anim` et les classes `en-tir`, `en-cours`, vider la ref d'animation, puis rappeler `rafraichir` avec les props courantes (`propsRef`, donc le marquage réel du moment, même si d'autres tirs ont eu lieu), qui redessine les places et pose `derniere`. Exception : quand `terminer` est appelé pour enchaîner un nouveau tir, il saute ce redessin; le démarrage suivant, dans le même `cy.batch`, dessine lui même les places, ce qui évite un clignotement.
6. Extraire le corps de l'effet de mise à jour existant en une fonction `rafraichir(cy, props)`. Elle met toujours à jour `franchissable`, `conflit`, `choix`, `inactif`, mais ne touche ni aux images des places ni à `derniere` (barre et arcs) quand une animation est en cours (ref non vide) ou va démarrer dans ce rendu (`animer && tir && tir.numero > dernierNumeroVu`). Sans ce test, l'effet existant, qui tourne avant l'effet d'animation, dessinerait un instant le marquage final et le rouge.
7. Si `marquage` change sans nouveau tir (Annuler, Réinitialiser) ou si `animer` passe à faux : terminer tout de suite. Le nettoyage du composant (démontage) annule la boucle.

**Styles ajoutés** (après `node.derniere` et `edge.derniere` dans `STYLE`, pour l'emporter; en particulier `edge.en-cours` doit venir après `edge.derniere`) :
- `node.jeton-anim` : ellipse 13 × 13, fond `#0f172a`, sans bordure ni étiquette, `events: 'no'`, `z-index-compare: 'manual'`, `z-index: 999`.
- `node.en-tir` : fond `#facc15`, `underlay-color: '#facc15'`, `underlay-opacity: 0.45`, `underlay-padding: 10`, `opacity: 1`.
- `edge.en-cours` : `line-color` et `target-arrow-color` `#eab308`, `width: 4`.
- Légende : ajouter « Transition en cours de tir » (barre jaune).

**Value sourcing**:
| Action | Valeur produite / affichée | Source |
|---|---|---|
| Démarrer une animation | « c'est un nouveau tir » | `tir.numero > dernierNumeroVu` (ref du composant) |
| Démarrer | transition, marquage d'avant | `EntreeHistorique.transition`, `.avant` (dernier de `sim.historique`) |
| Démarrer | durée totale | `dureeAnimation(tir.origine, vitesseMs)`; `origine` vient de l'action `tirer`, `vitesseMs` de `seq.vitesseMs` |
| Démarrer | arcs à parcourir | `entrees` / `sorties` de la transition dans `reseau`, ids `${place}->${t}` / `${t}->${place}` |
| Boucle | position d'un jeton | `pointSurArc` sur les points Cytoscape de l'arc (lus au démarrage, positions fixes) et `adoucir(progression)` |
| Boucle | phase courante | `phaseA(performance.now() − debut, dureeMs)` |
| Pendant | compte affiché dans les places | `marquageIntermediaire(transition, avant)` |
| Fin | marquage final affiché | `props.marquage` courant (via `propsRef`) |
| Toujours | animation activée | `seq.animerTirs`, défaut `true` |

**Key invariants**:
- L'animation ne dispatche jamais rien et n'écrit ni le marquage ni l'historique.
- Au plus une animation à la fois; démarrer en termine d'abord une éventuelle.
- Hors animation, aucun nœud `jeton-anim` ni classe `en-tir` / `en-cours` n'existe dans le graphe.
- Le graphe n'est jamais recréé; seuls des nœuds `jeton-anim` sont ajoutés puis retirés.
- `src/rdp/` ne change pas.

**Security model**: sans objet (application locale, aucune donnée externe).

**Configuration required**: aucune.

**Critical test scenarios**:
- Tests unitaires `src/components/animationTir.test.ts` : `phaseA` aux bornes 0, 40 %, 60 %, 100 % et au delà; `dureeAnimation` (700, 0,75 × 200 = 150, 0,75 × 2500 = 1875); `pointSurArc` à t = 0, 0,5, 1 en droite et en quadratique; `marquageIntermediaire` sur `t_refuser` (`B_tiers` à 0, `verification` à 0) sans modifier l'entrée. Vérifie **AC-1**, **AC-2**, **AC-3**, **AC-5**.
- Parcours nominal (à l'œil, `/check verify`) : scénario « appel réussi » à vitesse lente, chaque pas montre les trois phases et la barre jaune, le rouge apparaît à la fin. Vérifie **AC-1**, **AC-9**.
- Arcs courbés : tirer « Raccrocher A », les jetons suivent les arcs en pointillés vers `A_libre` et `B_libre`. Vérifie **AC-2**.
- Boucle : tirer `t_refuser`, `B_tiers` se vide puis se remplit. Vérifie **AC-3**.
- Clics rapides : cliquer trois transitions de suite en moins d'une seconde, l'historique a trois entrées, le marquage final est celui sans animation, aucun jeton ne traîne. Vérifie **AC-4**, **AC-6**.
- Annuler pendant une animation : l'animation s'arrête, le graphe montre l'état annulé. Vérifie **AC-7**.
- Case décochée : comportement d'aujourd'hui. Vérifie **AC-8**.
- Zoom, Recentrer et changement d'onglet pendant une animation. Vérifie **AC-10**.

## Build plan

Approche Skateboard : la première étape livre déjà une animation complète et démontrable (durée fixe), les suivantes l'enrichissent.

1. Écrire le module pur `src/components/animationTir.ts` et ses tests `animationTir.test.ts` (`phaseA`, `adoucir`, `pointSurArc`, `marquageIntermediaire`, `dureeAnimation`), satisfies **AC-2**, **AC-3**, **AC-5**.
2. Animer chaque tir dans `GrapheReseau` avec une durée fixe de 700 ms : props `tir`, détection par `numero`, nœuds `jeton-anim`, boucle d'image, trois phases, compte intermédiaire, classes `en-tir` et `en-cours`, `derniere` posée à la fin, extraction de `rafraichir`, styles. Passer `tir` depuis `App`. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-9**, **AC-10**.
3. Gérer les interruptions : terminer avant un nouveau tir, arrêt sur Annuler ou Réinitialiser, nettoyage au démontage, satisfies **AC-6**, **AC-7**, **AC-10**.
4. Ajouter `origine` à l'action `tirer` et à `EntreeHistorique`, mettre à jour les quatre points d'appel, passer `vitesseMs` au graphe et utiliser `dureeAnimation`, satisfies **AC-5**.
5. Ajouter `animerTirs` à `EtatSequentiel`, la case « Animer les tirs » dans `PanneauSequentiel` à côté du curseur, la prop `animer` du graphe (coupure immédiate si décochée), et l'entrée de légende, satisfies **AC-8**, **AC-1**.
6. Lancer `bun test` et `bun run check`, puis `/check verify` sur les scénarios ci dessus, satisfies **AC-1** à **AC-10**.

## Consequences

**Positive**:
- Le jury voit la règle de tir : consommation, franchissement, production.
- Le marquage reste juste quoi qu'il arrive à l'animation; aucun changement du noyau ni des tests existants (hors ajout de `origine`).
- Les calculs (phases, courbes, compte intermédiaire) sont testés sans navigateur.

**Negative / tradeoffs**:
- Pendant une animation, les panneaux et les transitions vertes montrent déjà l'état d'après; le graphe est en retard de 700 ms au plus.
- À la vitesse maximale (200 ms par pas), l'animation dure 150 ms et la barre ne brille que 30 ms, à peine visible. Pour montrer l'animation, ralentir le curseur.
- `pointSurArc` suppose que `controlPoints()` de Cytoscape renvoie les points de contrôle du tracé quadratique. Si un jeton s'écarte visiblement d'un arc courbé au `/check verify`, il faudra ajuster ce calcul.
- `GrapheReseau` grossit (environ 120 lignes) et gagne une boucle impérative à côté du flux React.

**Neutral**:
- `EntreeHistorique` porte une donnée d'affichage (`origine`) en plus de la donnée métier.
- Annuler un tir n'est pas animé : seul un vrai tir du réseau l'est.

## Follow-up

- [ ] Après la livraison, `/sync` pourra mentionner dans le `README.md` la case « Animer les tirs » et le lien entre la vitesse et la durée de l'animation.
