// État de la simulation : marquage courant et historique des tirs.

import type { OrigineTir } from '../components/animationTir'
import { estFranchissable, trouverTransition, tirer } from '../rdp/moteur'
import type { Marquage, Reseau, TransitionId } from '../rdp/types'

export interface EntreeHistorique {
  numero: number
  transition: TransitionId
  /** Qui a déclenché le tir : règle la durée de son animation. */
  origine: OrigineTir
  avant: Marquage
  apres: Marquage
}

export interface EtatSimulation {
  marquage: Marquage
  historique: EntreeHistorique[]
}

export type ActionSimulation =
  | { type: 'tirer'; transition: TransitionId; origine: OrigineTir }
  | { type: 'annuler' }
  | { type: 'reinitialiser' }

export function etatInitial(reseau: Reseau): EtatSimulation {
  return { marquage: reseau.marquageInitial, historique: [] }
}

export function creerReducer(reseau: Reseau) {
  return function reducer(etat: EtatSimulation, action: ActionSimulation): EtatSimulation {
    switch (action.type) {
      case 'tirer': {
        // Un tir non franchissable est ignoré : l'interface ne le propose pas.
        if (!estFranchissable(etat.marquage, trouverTransition(reseau, action.transition))) {
          return etat
        }
        const apres = tirer(reseau, etat.marquage, action.transition)
        return {
          marquage: apres,
          historique: [
            ...etat.historique,
            {
              numero: etat.historique.length + 1,
              transition: action.transition,
              origine: action.origine,
              avant: etat.marquage,
              apres,
            },
          ],
        }
      }
      case 'annuler': {
        const derniere = etat.historique.at(-1)
        if (!derniere) return etat
        return { marquage: derniere.avant, historique: etat.historique.slice(0, -1) }
      }
      case 'reinitialiser':
        return etatInitial(reseau)
    }
  }
}
