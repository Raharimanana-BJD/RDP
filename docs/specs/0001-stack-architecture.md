# 0001. Stack et architecture du simulateur RDP

**Date**: 2026-10-29
**Status**: In Progress

## Summary

Le simulateur est une application web qui tourne entièrement dans le navigateur. Elle est écrite en TypeScript avec React 19, dessine le réseau avec Cytoscape.js et se lance avec une seule commande, `bun run dev`, qui ouvre la page. Toute la logique du Réseau de Petri (modèle, moteur de tir, analyse) vit dans des fonctions pures sans interface, testées avec `bun test`. Ce choix garde le projet petit, rapide à démontrer et facile à expliquer à la soutenance.

## Context

Projet scolaire présenté en soutenance, développé par une seule personne. Le réseau est petit (une dizaine de places et de transitions) et fixe : il modélise l'appel réussi et l'appel échoué de l'énoncé. Il n'y a ni comptes, ni données à conserver, ni déploiement : tout se passe sur une machine, devant un jury.

Les forces qui comptent :
- **Démonstration fiable** : un démarrage en une commande, un dessin identique à chaque lancement, aucun aléa réseau.
- **Explicabilité** : le jury doit pouvoir suivre le lien entre l'énoncé, le modèle et le code.
- **Croissance par versions** (approche Skateboard du scope) : v1 graphe interactif, v2 historique et mode séquentiel, v3 analyse (matrice d'incidence, graphe des marquages). La base doit accueillir ces trois versions sans réécriture.
- **Machine de présentation** : Bun est installé (Bun 1.3, Node 26 aussi présent).

## Options considered

### Option 1: SPA React + Cytoscape, tout dans le navigateur, outillage Bun
Une page unique (SPA, application d'une seule page) servie par Vite. Le modèle et le moteur sont des modules TypeScript purs.

**Pros**: une seule couche, clics instantanés, l'analyse reste peu coûteuse en JS vu la taille du réseau; React et Cytoscape sont très documentés.
**Cons**: aucune séparation client serveur à montrer; Bun est moins standard que npm.

### Option 2: Moteur côté serveur (API Node) + interface navigateur
Une API tient le marquage et tire les transitions; le navigateur l'appelle.

**Pros**: montre une architecture client serveur.
**Cons**: double état à synchroniser, une API à écrire et à lancer, aucun gain fonctionnel pour un réseau de cette taille.

### Option 3: TypeScript sans framework + SVG fait main
**Pros**: zéro dépendance, contrôle total du rendu des jetons.
**Cons**: flèches, tracés et mises à jour du DOM à écrire soi même; les panneaux des versions 2 et 3 deviennent pénibles à maintenir.

## Decision

**Chosen option**: Option 1: SPA React + Cytoscape, tout dans le navigateur, outillage Bun.

Le simulateur est une SPA TypeScript (React 19, Vite) lancée par `bun run dev`; la logique RDP est un noyau pur sans dépendance à l'interface.

**Implementation skills**: aucune (installation refusée par l'ingénieur).

## Rationale

La fiabilité de la démo et la taille du réseau rendent un serveur applicatif inutile : il ajouterait une couche à lancer et un état à synchroniser sans rien apporter. Un noyau pur (`franchissables`, `tirer`, `conflits`, analyse) se teste sans navigateur et s'explique ligne par ligne au jury. Cytoscape fournit formes, flèches, zoom et clics, et sert aussi pour le graphe des marquages en v3; des coordonnées fixes dans le modèle donnent un dessin stable qui raconte l'histoire (colonne appelant, colonne appelé). L'ingénieur a choisi Bun plutôt que npm : c'est acceptable puisque Bun est installé sur la machine de présentation, et `bun test` évite d'ajouter Vitest.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Architecture | SPA unique, aucune logique côté serveur | Le réseau est petit, tout calcul est instantané dans le navigateur. |
| Runtime et paquets | Bun (`bun.lock`), Bun seulement | Choix de l'ingénieur; un seul outil pour installer, lancer et tester. |
| Build et serveur local | Vite (dernière version majeure), `server.open` activé | `bun run dev` démarre et ouvre le navigateur en une commande. |
| Langage | TypeScript, mode strict | Les formes du réseau (`Marquage = Record<PlaceId, number>`) sont vérifiées à la compilation. |
| UI | React 19 | Panneaux (historique, séquentiel, analyse) simples à composer. |
| État | `useReducer` autour du moteur pur | Marquage et historique dans un seul reducer; le retour arrière revient à dépiler. |
| Rendu du graphe | Cytoscape.js via un petit composant maison (`GrapheReseau`) | Formes, flèches, clics intégrés; pas de wrapper peu maintenu. |
| Mise en page | Coordonnées fixes dans `reseau.ts`; layout `breadthfirst` intégré pour le graphe des marquages | Dessin identique à chaque lancement; aucune dépendance de layout. |
| Format du réseau | Module TypeScript typé (`src/rdp/reseau.ts`) | Vérifié par le compilateur, chaque élément porte sa phrase de l'énoncé. |
| Style | CSS simple (un fichier global) | Une page, peu de styles. |
| Tests | `bun test` sur le noyau (`src/rdp/`) | Les bugs du moteur sont invisibles à l'écran; tests rapides, sans installation. |
| Vérification | `tsc` (type check), oxlint (lint) et Prettier | Base de la fonctionnalité 2 (conventions et outillage). |
| Livraison | Dépôt ou zip des sources + README (`bun install && bun run dev`) | Choix de l'ingénieur. |

**Structure du code**:
- `src/rdp/` : noyau pur, sans React (types, réseau, moteur, analyse, scénarios) et ses tests.
- `src/components/` : composants React (graphe, panneaux).
- `src/state/` : reducer de la simulation.

## Consequences

**Positive**:
- Une commande pour lancer, aucun service externe, démo stable.
- Le noyau est testable et réutilisable (éditeur générique différé).

**Negative / tradeoffs**:
- Bun seulement : la machine qui lance le projet doit avoir Bun.
- Cytoscape dessine les jetons via le libellé et le style des nœuds, pas en SVG libre; des points animés demanderaient plus de travail.
- Les coordonnées fixes sont à retoucher à la main si le réseau change.

**Neutral**:
- TypeScript est épinglé sur la version que fournit le modèle Vite au moment du scaffold.

## Follow-up

- [x] Agent Skills et serveurs MCP refusés pour cette stack (Bun, Vite, React, TypeScript, Cytoscape) : noté dans la ligne `Declined:` de `AGENTS.md`.

## References

**Project sources**:
- `docs/scope/scope.md` : approche Skateboard, niveau Alpha, fonctionnalités 1 à 8.
- Capture de l'énoncé (`lwcxMdmF.jpg`).

**Practices & standards**:
- Noyau fonctionnel pur, interface en périphérie (functional core, imperative shell).
- Monolithe d'abord pour une équipe d'une personne.

**Links**: none verified (versions lues sur le registre npm le 2026-10-29 : Vite 8.3, React 19.3, Cytoscape.js 3.34, TypeScript 7.0).
