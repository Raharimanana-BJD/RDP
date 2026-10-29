// Règles de tir d'un Réseau de Petri. Fonctions pures : elles ne modifient jamais
// le marquage reçu et renvoient un nouveau marquage.

import type { Marquage, Reseau, Transition, TransitionId } from './types'

export function trouverTransition(reseau: Reseau, id: TransitionId): Transition {
  const t = reseau.transitions.find((tr) => tr.id === id)
  if (!t) throw new Error(`Transition inconnue : ${id}`)
  return t
}

/** Une transition est franchissable si chaque place d'entrée a assez de jetons. */
export function estFranchissable(m: Marquage, t: Transition): boolean {
  return t.entrees.every((a) => (m[a.place] ?? 0) >= a.poids)
}

export function franchissables(reseau: Reseau, m: Marquage): Transition[] {
  return reseau.transitions.filter((t) => estFranchissable(m, t))
}

/** Tire la transition : retire les jetons des entrées, puis ajoute ceux des sorties. */
export function tirer(reseau: Reseau, m: Marquage, id: TransitionId): Marquage {
  const t = trouverTransition(reseau, id)
  if (!estFranchissable(m, t)) {
    throw new Error(`La transition « ${t.nom} » n'est pas franchissable.`)
  }
  const suivant: Marquage = { ...m }
  for (const a of t.entrees) suivant[a.place] = (suivant[a.place] ?? 0) - a.poids
  for (const a of t.sorties) suivant[a.place] = (suivant[a.place] ?? 0) + a.poids
  return suivant
}

export interface Conflit {
  /** Places dont les jetons sont disputés. */
  places: string[]
  transitions: TransitionId[]
}

/**
 * Conflit effectif : plusieurs transitions franchissables partagent une place
 * d'entrée qui n'a pas assez de jetons pour les tirer toutes.
 * Tirer l'une désactive alors les autres.
 */
export function conflits(reseau: Reseau, m: Marquage): Conflit[] {
  const actives = franchissables(reseau, m)
  const resultat: Conflit[] = []
  for (const p of reseau.places) {
    const concurrentes = actives.filter((t) => t.entrees.some((a) => a.place === p.id))
    if (concurrentes.length < 2) continue
    const besoin = concurrentes.reduce(
      (s, t) => s + t.entrees.filter((a) => a.place === p.id).reduce((x, a) => x + a.poids, 0),
      0,
    )
    if ((m[p.id] ?? 0) < besoin) {
      // Même groupe de transitions sur plusieurs places : un seul conflit.
      const ids = concurrentes.map((t) => t.id)
      const existant = resultat.find((c) => c.transitions.join() === ids.join())
      if (existant) existant.places.push(p.id)
      else resultat.push({ places: [p.id], transitions: ids })
    }
  }
  return resultat
}

export function marquagesEgaux(a: Marquage, b: Marquage): boolean {
  const cles = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of cles) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false
  return true
}

/** Clé stable d'un marquage, dans l'ordre des places du réseau. */
export function cleMarquage(reseau: Reseau, m: Marquage): string {
  return reseau.places.map((p) => m[p.id] ?? 0).join(',')
}

/** Texte lisible : les places marquées, par exemple « A libre, B libre ». */
export function decrireMarquage(reseau: Reseau, m: Marquage): string {
  const marquees = reseau.places
    .filter((p) => (m[p.id] ?? 0) > 0)
    .map((p) => ((m[p.id] ?? 0) > 1 ? `${p.nom} ×${m[p.id]}` : p.nom))
  return marquees.length ? marquees.join(', ') : '(aucun jeton)'
}

/** Vecteur M = (m(P1), …, m(Pn)) dans l'ordre des places. */
export function vecteurMarquage(reseau: Reseau, m: Marquage): string {
  return `(${cleMarquage(reseau, m)})`
}
