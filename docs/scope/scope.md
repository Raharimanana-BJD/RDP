# Scope: Simulateur RDP (Réseau de Petri des appels téléphoniques)

Une application web, lancée par un petit serveur local, qui simule un Réseau de Petri combinant les deux systèmes de l'énoncé : l'appel réussi (composer, vérifier, sonner, accepter, communiquer, raccrocher) et l'appel échoué (ligne occupée ou délai sans réponse, puis fin de la tentative). Elle montre les places, les jetons et les transitions, et permet de tester les scénarios de façon interactive ou séquentielle. Projet scolaire à rendre et à présenter.

**Build approach:** Skateboard (d'abord la plus petite version utilisable en entier, puis on l'enrichit version après version, chaque version restant démontrable).
**Workflow:** Alpha (après `/develop`, un `/check verify` sur l'appli qui tourne). C'est le niveau de rigueur par défaut. `/architect` est le premier arrêt conseillé pour une fonctionnalité avec une vraie décision, mais vous pouvez le sauter si vous savez déjà comment la construire. Chaque fonctionnalité peut porter son propre niveau (par exemple `· Beta`).

_Ce sont des recommandations pour garder une construction ordonnée, pas des obligations. Sautez ce qui ne vous convient pas : si vous savez déjà construire une fonctionnalité, passez par `/develop` sans `/architect`. C'est vous qui décidez quand une fonctionnalité est `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | in-progress |
| 2 | Coding standards & tooling | Foundation | in-progress |
| 3 | Modèle du réseau combiné | Foundation | in-progress |
| 4 | Moteur de tir | Version 1 | in-progress |
| 5 | Simulation interactive sur graphe | Version 1 | in-progress |
| 6 | Historique des tirs | Version 2 | in-progress |
| 7 | Mode séquentiel et scénarios prédéfinis | Version 2 | in-progress |
| 8 | Analyse du réseau | Version 3 | in-progress |
| 9 | Animation des tirs | Version 4 | in-progress |

## Foundations

### 1. Stack & architecture
Choisir les outils et monter un projet qui démarre avec une seule commande sur un petit serveur local, pour que tout le reste repose sur une base réelle.
**Done when:** le choix est noté dans une spec, et le projet vide démarre en local et s'ouvre dans le navigateur.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Build it: scaffold Bun + Vite + React + TypeScript + Cytoscape
- [x] Verify it: `bun run dev` ouvre la page (vérifié dans Chromium)

spec [0001](../specs/0001-stack-architecture.md) · code in `package.json`, `vite.config.ts`

### 2. Coding standards & tooling
Noter les conventions du projet, puis installer le formatage et la vérification du code à partir du vrai projet monté.
**Done when:** `AGENTS.md` à la racine décrit la vraie stack, et le formatage et la vérification passent sans erreur.
- [x] Capture conventions + tooling choices: `AGENTS.md`, oxlint, Prettier, `bun run check`

code in `AGENTS.md`, `.prettierrc`

### 3. Modèle du réseau combiné
Le cœur du projet : un seul Réseau de Petri qui réunit les deux systèmes de l'énoncé pour deux utilisateurs (appelant et appelé). Il fixe la liste des places (ligne libre, numéro composé, vérification, sonnerie, communication, ligne occupée, pas de réponse, tentative terminée…), les transitions, les arcs et le marquage initial. Le conflit principal est au moment de la vérification : correspondant disponible, déjà en communication, ou qui ne répond pas après le délai.
**Done when:** le réseau couvre l'appel réussi, la ligne occupée et le délai sans réponse; depuis chaque fin d'appel les deux lignes redeviennent disponibles; une ligne en communication ne peut pas recevoir un autre appel; chaque place et transition est reliée à une phrase de l'énoncé.
- [x] Design it: décisions notées dans `README.md` (section Le modèle) et dans les commentaires du module
- [x] Build it: 10 places, 12 transitions, 2 invariants de ligne
- [x] Verify it: tests `bun test` (scénarios, invariants)

code in `src/rdp/reseau.ts`

## Version 1: le simulateur minimal utilisable

### 4. Moteur de tir
Les règles d'un Réseau de Petri appliquées au modèle : savoir quelles transitions sont franchissables, tirer une transition (retirer et ajouter les jetons), et repérer les conflits quand plusieurs transitions se disputent les mêmes jetons.
**Done when:** pour n'importe quel marquage, le moteur donne la bonne liste de transitions franchissables, refuse de tirer une transition non franchissable, met à jour le marquage correctement et signale les conflits.
- [x] Build it: `franchissables`, `tirer`, `conflits`
- [x] Verify it: tests `bun test`

code in `src/rdp/moteur.ts`

### 5. Simulation interactive sur graphe
La page principale : le réseau dessiné (places en cercles avec leurs jetons, transitions en barres, arcs fléchés). Les transitions franchissables s'allument, et un clic dessus les tire. Avec cette version, vous pouvez déjà dérouler un appel réussi ou échoué à la main pendant la soutenance.
**Done when:** le graphe complet s'affiche lisiblement, les jetons bougent après chaque clic, seules les transitions franchissables sont cliquables, et un bouton remet le marquage initial.
- [x] Build it: graphe Cytoscape à positions fixes, clic pour tirer, surbrillance des transitions franchissables et des conflits, phrase de l'énoncé au survol
- [x] Verify it: clics et réinitialisation vérifiés dans Chromium

code in `src/components/GrapheReseau.tsx`, `src/components/Panneaux.tsx`

## Version 2: rejouer et suivre

### 6. Historique des tirs
Un journal de chaque transition tirée avec le marquage obtenu, plus un retour en arrière d'un pas, pour expliquer un déroulement étape par étape.
**Done when:** chaque tir ajoute une ligne lisible au journal, le retour en arrière restaure exactement le marquage précédent, et la remise à zéro vide le journal.
- [x] Build it: journal des tirs, annuler, réinitialiser
- [x] Verify it: annuler et réinitialiser vérifiés dans Chromium

code in `src/state/simulation.ts`

### 7. Mode séquentiel et scénarios prédéfinis
Le mode séquentiel : lecture automatique pas à pas avec pause et vitesse réglable, et en cas de conflit un choix clair (demander à l'utilisateur ou choisir au hasard). Plus des boutons qui rejouent les scénarios de l'énoncé : appel réussi, ligne occupée, pas de réponse.
**Done when:** chaque scénario prédéfini se rejoue jusqu'au bout et finit avec les deux lignes disponibles; le mode automatique s'arrête quand plus aucune transition n'est franchissable et le signale.
- [x] Build it: lecture auto, pas à pas, vitesse, choix demandé ou au hasard, arrêt au blocage ou au retour à M0, trois scénarios
- [x] Verify it: les trois scénarios rejoués dans Chromium finissent avec les deux lignes libres

code in `src/state/useSequentiel.ts`, `src/rdp/scenarios.ts`

## Version 3: montrer l'intérêt du modèle

### 8. Analyse du réseau
Le volet théorique pour la note : matrice d'incidence, graphe des marquages accessibles, et vérification des propriétés (réseau borné, vivant, sans blocage, invariants comme « une ligne n'est jamais libre et occupée à la fois »).
**Done when:** la matrice d'incidence et le graphe des marquages s'affichent, et chaque propriété est annoncée vraie ou fausse avec une courte explication.
- [x] Build it: matrices Pre, Post, C, graphe des marquages (12), propriétés et invariants
- [x] Verify it: tests `bun test` et affichage vérifié dans Chromium

code in `src/rdp/analyse.ts`, `src/components/Analyse.tsx`

## Version 4: rendre les tirs lisibles

### 9. Animation des tirs
Animer chaque tir pour que le jury voie le jeu des jetons : les jetons glissent le long des arcs, des places d'entrée vers la barre, puis de la barre vers les places de sortie, et la transition tirée s'allume brièvement pendant ce passage. La durée suit le curseur de vitesse en mode séquentiel, avec une durée fixe pour un clic manuel.
**Done when:** chaque tir (clic, bouton, scénario, lecture auto) montre les jetons qui voyagent et la transition qui s'allume; le marquage final est identique à celui d'avant l'animation; la durée suit le curseur de vitesse; un clic pendant une animation ne casse ni le marquage ni l'historique.
spec: [0002](../specs/0002-animation-tirs.md)
- [x] Design it (spec): `/architect animation des tirs`
- [x] Build it: `/develop animation des tirs`
  - [x] Calculs purs de l'animation et leurs tests (phases, courbes, compte intermédiaire, durée) · AC-2, AC-3, AC-5
  - [x] Jetons voyageurs et barre allumée sur le graphe, à durée fixe · AC-1, AC-2, AC-3, AC-4, AC-9, AC-10
  - [x] Interruptions : enchaîner un tir, Annuler et Réinitialiser, changement d'onglet · AC-6, AC-7, AC-10
  - [x] Origine du tir, durée selon le curseur, case « Animer les tirs » et légende · AC-5, AC-8
- [ ] Verify it: `/check verify animation des tirs`

code in `src/components/animationTir.ts`, `src/components/GrapheReseau.tsx`

## Deferred
Hors du périmètre actuel, gardé pour que le plan reste honnête.
- **Plusieurs utilisateurs**: simuler trois utilisateurs ou plus, pour montrer un appel refusé pendant une communication en cours · needs a decision
- **Éditeur de réseau générique**: charger ou dessiner d'autres Réseaux de Petri · needs a decision
- **Export**: enregistrer le graphe en image ou le réseau en fichier pour le rapport
- **Suite de tests automatiques**: utile si l'enseignant note aussi les tests (passer au niveau `· Beta`)

## Legend

**The decision box.** Chaque fonctionnalité porte au plus une case dont le libellé finit par `(spec)` (`Design it (spec)` en général, `Decide the stack (spec)` pour la stack). Les autres skills la repèrent par ce suffixe `(spec)`. Toutes les autres cases sont des cases d'exécution.

**Cycle de vie d'une fonctionnalité**:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | une case : `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | `/architect` à la capture de la spec | `Design it` cochée; spec liée; `Build it: /develop <feature>` + 2 à 5 jalons; `Verify it` (Alpha et plus) |
| `in-progress` (building) | `/develop` | les jalons se cochent un par un; chemin du code ajouté |
| `in-progress` (verified) | `/check verify` | `Build it` et `Verify it` cochées |
| `done` | vous, quand vous le décidez; `/sync` réconcilie | au niveau Alpha, le point conseillé est après `/check verify` |

- **Prochaine étape** = la première case non cochée.
- **needs a decision** = passer d'abord par `/architect`; sinon directement `/develop` (ou `/audit` pour les conventions).
- **Les tâches détaillées vivent dans la `## Build plan` de la spec**, pas ici.
- **Status** `planned` → `in-progress` → `done`, plus `existing` et `dropped`.
- **Tag de niveau** à côté d'un titre (par exemple `· Beta`) change la rigueur pour cette seule fonctionnalité.
- **Workflow** (ligne d'en tête) : **Prototype** = rien après `/develop`; **Alpha** = `/check verify`; **Beta** = `/check verify` puis `/test`; **GA** = en plus `/check review` puis `/document`.
- **Ligne de pointeurs** (`spec <n> · code in <path>`) : le lien de spec ajouté par `/architect`, le chemin du code par `/develop`.
