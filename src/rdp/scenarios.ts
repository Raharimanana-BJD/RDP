// Scénarios de l'énoncé, rejoués depuis le marquage initial.

import type { TransitionId } from './types'

export interface Scenario {
  id: string
  nom: string
  description: string
  sequence: TransitionId[]
}

export const scenarios: Scenario[] = [
  {
    id: 'reussi',
    nom: 'Appel réussi',
    description: 'A compose, B est disponible, le téléphone sonne, B accepte, puis A raccroche.',
    sequence: ['t_composer', 't_verifier', 't_etablir', 't_accepter', 't_raccrocher_A'],
  },
  {
    id: 'occupe',
    nom: 'Ligne occupée',
    description:
      'B est déjà en communication avec un tiers : l’appel de A est refusé, A termine la tentative, puis B finit son appel.',
    sequence: [
      't_tiers_debut',
      't_composer',
      't_verifier',
      't_refuser',
      't_terminer_occupee',
      't_tiers_fin',
    ],
  },
  {
    id: 'sans_reponse',
    nom: 'Pas de réponse',
    description:
      'Le téléphone de B sonne, personne ne répond, le délai expire et A termine la tentative.',
    sequence: ['t_composer', 't_verifier', 't_etablir', 't_delai', 't_terminer_sans_reponse'],
  },
]
