// Calculs de l'animation d'un tir : durée, phases, position d'un jeton sur un arc,
// compte intermédiaire des places. Module pur : ni React, ni DOM, ni Cytoscape.

import type { Marquage, Transition } from '../rdp/types'

export type OrigineTir = 'manuel' | 'sequentiel'

export const DUREE_MANUELLE_MS = 700
export const PART_SEQUENTIELLE = 0.75
/** Part de la durée totale : jetons vers la barre, barre allumée, jetons vers les sorties. */
export const PHASES = { entree: 0.4, barre: 0.2, sortie: 0.4 } as const

export type Phase = 'entree' | 'barre' | 'sortie' | 'fin'

export interface Point {
  x: number
  y: number
}

export function dureeAnimation(origine: OrigineTir, vitesseMs: number): number {
  return origine === 'manuel' ? DUREE_MANUELLE_MS : Math.round(PART_SEQUENTIELLE * vitesseMs)
}

/** Phase atteinte après `ecouleMs`, et progression de 0 à 1 dans cette phase. */
export function phaseA(ecouleMs: number, dureeMs: number): { phase: Phase; progression: number } {
  if (dureeMs <= 0 || ecouleMs >= dureeMs) return { phase: 'fin', progression: 1 }
  const t = Math.max(0, ecouleMs) / dureeMs
  const finEntree = PHASES.entree
  // 1 − sortie plutôt que entree + barre : 0.4 + 0.2 ne vaut pas exactement 0.6.
  const finBarre = 1 - PHASES.sortie
  if (t < finEntree) return { phase: 'entree', progression: t / PHASES.entree }
  if (t < finBarre) return { phase: 'barre', progression: (t - finEntree) / PHASES.barre }
  return { phase: 'sortie', progression: (t - finBarre) / PHASES.sortie }
}

/** Accélère puis freine (ease in out quadratique). */
export function adoucir(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/**
 * Point à la fraction `t` d'un arc décrit par `[source, ...controles, cible]`.
 * Sans point de contrôle : droite. Un point : Bezier quadratique, comme le dessine
 * Cytoscape. Plus d'un : ligne brisée passant par les points (absent du réseau actuel).
 */
export function pointSurArc(points: Point[], t: number): Point {
  const [s] = points
  const c = points[points.length - 1]
  if (points.length === 2) {
    return { x: s.x + (c.x - s.x) * t, y: s.y + (c.y - s.y) * t }
  }
  if (points.length === 3) {
    const k = points[1]
    const u = 1 - t
    return {
      x: u * u * s.x + 2 * u * t * k.x + t * t * c.x,
      y: u * u * s.y + 2 * u * t * k.y + t * t * c.y,
    }
  }
  const longueurs = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y))
  const total = longueurs.reduce((a, b) => a + b, 0)
  let reste = t * total
  for (let i = 0; i < longueurs.length; i++) {
    if (reste <= longueurs[i] || i === longueurs.length - 1) {
      const f = longueurs[i] === 0 ? 0 : Math.min(1, reste / longueurs[i])
      const a = points[i]
      const b = points[i + 1]
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
    }
    reste -= longueurs[i]
  }
  return c
}

/** Marquage pendant le trajet : les jetons d'entrée sont partis, ceux de sortie pas encore arrivés. */
export function marquageIntermediaire(transition: Transition, avant: Marquage): Marquage {
  const m: Marquage = { ...avant }
  for (const a of transition.entrees) m[a.place] = (m[a.place] ?? 0) - a.poids
  return m
}
