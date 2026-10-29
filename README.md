# Simulateur RDP : appels téléphoniques

Simulateur de Réseau de Petri qui réunit les deux systèmes de l'énoncé :

- **Système 1, appel réussi** : composer, vérifier, sonner, accepter, communiquer, raccrocher.
- **Système 2, appel échoué** : ligne occupée ou pas de réponse après un délai, puis fin de la tentative.

## Lancer le projet

Prérequis : [Bun](https://bun.sh) 1.3 ou plus récent.

```sh
bun install
bun run dev
```

Le navigateur s'ouvre sur la page du simulateur.

| Commande          | Rôle                                                   |
| ----------------- | ------------------------------------------------------ |
| `bun run dev`     | Serveur local avec ouverture du navigateur             |
| `bun test`        | Tests du moteur de tir et de l'analyse                 |
| `bun run check`   | Vérification des types, lint (oxlint) et formatage     |
| `bun run format`  | Formate le code (Prettier)                             |
| `bun run build`   | Version optimisée dans `dist/`                         |
| `bun run preview` | Sert la version optimisée                              |

## Utilisation

**Onglet Simulation**

- Les places sont des cercles : bleu pour la ligne de A, violet pour la ligne de B, vert pour la communication (les deux lignes). Les points noirs sont les jetons.
- Les transitions sont des barres. **Vert** : franchissable, un clic la tire. **Orange** : franchissable mais en conflit avec une autre. **Rouge** : dernière transition tirée.
- Le survol d'un élément affiche la phrase de l'énoncé qu'il représente.
- **Mode séquentiel** : trois scénarios prédéfinis (appel réussi, ligne occupée, pas de réponse), lecture automatique, pas à pas, vitesse réglable. En cas de choix, le simulateur vous demande ou choisit au hasard.
- **Historique** : chaque tir avec le marquage obtenu, retour en arrière d'un pas, remise à zéro.

**Onglet Analyse**

- Propriétés : borné, sans blocage, réversible, vivant, et les invariants « une ligne n'est jamais dans deux états à la fois ».
- Matrices Pre, Post et d'incidence C = Post − Pre.
- Graphe des marquages accessibles, avec le marquage courant entouré en rouge.

## Le modèle

| Place                        | Ligne | Sens                                         |
| ---------------------------- | ----- | -------------------------------------------- |
| A libre                      | A     | Téléphone de l'appelant disponible           |
| Numéro composé               | A     | A a composé le numéro                        |
| Vérification                 | A     | Le système vérifie l'état du correspondant   |
| A attend                     | A     | Appel établi, A attend la réponse            |
| B libre                      | B     | Correspondant disponible                     |
| B sonne                      | B     | Le téléphone de B sonne                      |
| Communication                | A et B | Les deux utilisateurs sont en communication |
| Pas de réponse               | A     | Délai expiré, appel interrompu               |
| Ligne occupée                | A     | Appel refusé, message « ligne occupée »      |
| B en communication (tiers)   | B     | B est déjà en communication avec un tiers    |

Avec seulement deux utilisateurs, « le correspondant est déjà en communication » est modélisé par la place **B en communication (tiers)** : B parle à quelqu'un d'extérieur. La transition **Refuser (occupé)** lit cette place sans la vider.

Conflits du modèle :

- **Vérification** : établir l'appel (B libre) ou refuser (B occupé). C'est l'état de B qui décide.
- **B libre** : l'appel de A arrive pendant que B commence un appel avec un tiers.
- **Sonnerie** : B accepte, ou le délai expire.
- **Communication** : A raccroche, ou B raccroche.

Le réseau a 12 marquages accessibles. Il est sauf (1 borné), vivant, sans blocage et réversible : chaque fin d'appel rend les deux lignes disponibles.

## Structure

```
src/rdp/          noyau pur, sans interface : types, réseau, moteur, analyse, scénarios, tests
src/state/        état de la simulation (reducer) et mode séquentiel
src/components/   graphe Cytoscape, panneaux, page Analyse
docs/             scope et spec de la stack
```
