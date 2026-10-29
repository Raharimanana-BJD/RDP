# AGENTS.md

Simulateur de Réseau de Petri (appels téléphoniques A → B), projet scolaire. Voir `README.md` pour l'usage, `docs/scope/scope.md` pour le plan, `docs/specs/0001-stack-architecture.md` pour la stack.

## Stack

- Bun seulement (`bun.lock`), pas de npm. Vite 8, React 19, TypeScript strict, Cytoscape.js.
- Tout tourne dans le navigateur, aucun serveur applicatif.

## Commandes

- `bun run dev` : serveur local, ouvre le navigateur.
- `bun test` : tests du noyau (`src/rdp/*.test.ts`, `bun:test`).
- `bun run check` : `tsc -b`, `oxlint`, `prettier --check .`. Doit passer avant de livrer.

## Rules

- `src/rdp/` est un noyau pur : aucune importation de React ni du DOM. Les fonctions ne modifient jamais un marquage reçu, elles en renvoient un nouveau.
- Le réseau vit dans `src/rdp/reseau.ts`. Chaque place et transition porte `enonce` (sa phrase de l'énoncé) et ses coordonnées `x`, `y` (dessin fixe). Garder les deux invariants de ligne vrais.
- Identifiants en anglais ou ASCII court (`t_composer`, `A_libre`), textes visibles en français.
- Le graphe Cytoscape est créé une fois (`GrapheReseau`) puis mis à jour par classes et données ; ne pas le recréer à chaque rendu.
- Prettier : pas de point virgule, guillemets simples, largeur 100.

## Agent skills

Declined: Agent Skills et serveurs MCP pour Bun, Vite, React, TypeScript, Cytoscape (refusés le 2026-10-29).
