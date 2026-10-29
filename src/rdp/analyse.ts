// Analyse du réseau : matrices, graphe des marquages accessibles, propriétés.

import { cleMarquage, franchissables, tirer } from './moteur'
import type { Invariant, Marquage, Reseau, TransitionId } from './types'

export interface Matrices {
  /** pre[p][t] : jetons que t consomme dans p. */
  pre: number[][]
  /** post[p][t] : jetons que t produit dans p. */
  post: number[][]
  /** C = Post − Pre (matrice d'incidence). */
  c: number[][]
}

export function matrices(reseau: Reseau): Matrices {
  const pre = reseau.places.map((p) =>
    reseau.transitions.map((t) =>
      t.entrees.filter((a) => a.place === p.id).reduce((s, a) => s + a.poids, 0),
    ),
  )
  const post = reseau.places.map((p) =>
    reseau.transitions.map((t) =>
      t.sorties.filter((a) => a.place === p.id).reduce((s, a) => s + a.poids, 0),
    ),
  )
  const c = pre.map((ligne, i) => ligne.map((v, j) => post[i][j] - v))
  return { pre, post, c }
}

export interface EtatAccessible {
  id: number
  marquage: Marquage
  cle: string
}

export interface ArcAccessible {
  de: number
  vers: number
  transition: TransitionId
}

export interface GrapheAccessibilite {
  etats: EtatAccessible[]
  arcs: ArcAccessible[]
  /** Faux si l'exploration a été coupée par la limite (réseau peut être non borné). */
  complet: boolean
}

/** Parcours en largeur depuis le marquage initial. L'état 0 est M0. */
export function grapheAccessibilite(reseau: Reseau, limite = 5000): GrapheAccessibilite {
  const etats: EtatAccessible[] = []
  const arcs: ArcAccessible[] = []
  const index = new Map<string, number>()
  const ajouter = (m: Marquage) => {
    const cle = cleMarquage(reseau, m)
    const existant = index.get(cle)
    if (existant !== undefined) return { id: existant, nouveau: false }
    const id = etats.length
    etats.push({ id, marquage: m, cle })
    index.set(cle, id)
    return { id, nouveau: true }
  }

  ajouter(reseau.marquageInitial)
  const file = [0]
  let complet = true
  while (file.length) {
    if (etats.length >= limite) {
      complet = false
      break
    }
    const courant = file.shift()!
    for (const t of franchissables(reseau, etats[courant].marquage)) {
      const { id, nouveau } = ajouter(tirer(reseau, etats[courant].marquage, t.id))
      arcs.push({ de: courant, vers: id, transition: t.id })
      if (nouveau) file.push(id)
    }
  }
  return { etats, arcs, complet }
}

export interface Propriete {
  nom: string
  vraie: boolean
  explication: string
}

/** Ensemble des états atteignables depuis `depart` (lui compris). */
function atteignables(g: GrapheAccessibilite, depart: number): Set<number> {
  const succ = new Map<number, number[]>()
  for (const a of g.arcs) succ.set(a.de, [...(succ.get(a.de) ?? []), a.vers])
  const vus = new Set([depart])
  const pile = [depart]
  while (pile.length) {
    for (const s of succ.get(pile.pop()!) ?? []) {
      if (!vus.has(s)) {
        vus.add(s)
        pile.push(s)
      }
    }
  }
  return vus
}

export function proprietes(reseau: Reseau, g: GrapheAccessibilite): Propriete[] {
  const nomT = (id: string) => reseau.transitions.find((t) => t.id === id)?.nom ?? id
  const resultat: Propriete[] = []

  // Borné : le graphe est fini, la borne est le maximum de jetons dans une place.
  const borne = Math.max(...g.etats.flatMap((e) => Object.values(e.marquage)))
  resultat.push({
    nom: 'Borné',
    vraie: g.complet,
    explication: g.complet
      ? `Le graphe des marquages est fini (${g.etats.length} marquages). Aucune place ne dépasse ${borne} jeton${borne > 1 ? 's' : ''} : le réseau est ${borne}-borné${borne === 1 ? ' (sauf)' : ''}.`
      : `L'exploration a dépassé ${g.etats.length} marquages : le réseau semble non borné.`,
  })

  // Sans blocage : chaque marquage accessible permet au moins un tir.
  const sortants = new Set(g.arcs.map((a) => a.de))
  const bloques = g.etats.filter((e) => !sortants.has(e.id))
  resultat.push({
    nom: 'Sans blocage',
    vraie: bloques.length === 0,
    explication:
      bloques.length === 0
        ? 'Depuis chaque marquage accessible, au moins une transition est franchissable.'
        : `${bloques.length} marquage(s) sans transition franchissable, par exemple M${bloques[0].id}.`,
  })

  // Réversible : M0 est atteignable depuis chaque marquage.
  const nonRetour = g.etats.filter((e) => !atteignables(g, e.id).has(0))
  resultat.push({
    nom: 'Réversible',
    vraie: nonRetour.length === 0,
    explication:
      nonRetour.length === 0
        ? 'Depuis chaque marquage, on peut revenir au marquage initial M0 : chaque appel se termine avec les deux lignes disponibles.'
        : `Depuis M${nonRetour[0].id}, on ne peut plus revenir à M0.`,
  })

  // Vivant : depuis chaque marquage accessible, chaque transition peut encore être tirée.
  let contreExemple: { etat: number; transition: string } | null = null
  for (const e of g.etats) {
    const accessibles = atteignables(g, e.id)
    const tirables = new Set(g.arcs.filter((a) => accessibles.has(a.de)).map((a) => a.transition))
    const manquante = reseau.transitions.find((t) => !tirables.has(t.id))
    if (manquante) {
      contreExemple = { etat: e.id, transition: manquante.id }
      break
    }
  }
  resultat.push({
    nom: 'Vivant',
    vraie: contreExemple === null,
    explication:
      contreExemple === null
        ? 'Depuis n’importe quel marquage accessible, chaque transition peut encore être tirée plus tard : aucune partie du réseau ne meurt.'
        : `Depuis M${contreExemple.etat}, la transition « ${nomT(contreExemple.transition)} » ne peut plus jamais être tirée.`,
  })

  return resultat
}

export interface ResultatInvariant {
  invariant: Invariant
  /** Vrai si x · C = 0 (preuve structurelle, indépendante du marquage). */
  structurel: boolean
  /** Valeur de la somme pondérée dans M0. */
  valeur: number
  /** Vrai si tous les marquages accessibles ont la même valeur. */
  verifieSurGraphe: boolean
}

export function verifierInvariants(reseau: Reseau, g: GrapheAccessibilite): ResultatInvariant[] {
  const { c } = matrices(reseau)
  return reseau.invariants.map((inv) => {
    const x = reseau.places.map((p) => inv.poids[p.id] ?? 0)
    const structurel = reseau.transitions.every(
      (_, j) => x.reduce((s, xi, i) => s + xi * c[i][j], 0) === 0,
    )
    const somme = (m: Marquage) =>
      reseau.places.reduce((s, p) => s + (inv.poids[p.id] ?? 0) * (m[p.id] ?? 0), 0)
    const valeur = somme(reseau.marquageInitial)
    const verifieSurGraphe = g.etats.every((e) => somme(e.marquage) === valeur)
    return { invariant: inv, structurel, valeur, verifieSurGraphe }
  })
}
