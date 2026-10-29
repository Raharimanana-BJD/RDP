// Types du noyau Réseau de Petri. Aucune dépendance à React ni au navigateur.

export type PlaceId = string
export type TransitionId = string

/** Nombre de jetons dans chaque place. */
export type Marquage = Record<PlaceId, number>

export interface Arc {
  place: PlaceId
  poids: number
}

export interface Place {
  id: PlaceId
  nom: string
  /** Phrase de l'énoncé que la place représente. */
  enonce: string
  /** Ligne téléphonique concernée par la place. */
  ligne: 'A' | 'B' | 'A+B'
  x: number
  y: number
}

export interface Transition {
  id: TransitionId
  nom: string
  enonce: string
  /** Arcs place → transition (jetons consommés). */
  entrees: Arc[]
  /** Arcs transition → place (jetons produits). */
  sorties: Arc[]
  x: number
  y: number
}

/** Invariant de places : la somme pondérée des jetons reste constante. */
export interface Invariant {
  nom: string
  description: string
  poids: Record<PlaceId, number>
}

export interface Reseau {
  nom: string
  places: Place[]
  transitions: Transition[]
  marquageInitial: Marquage
  invariants: Invariant[]
}
