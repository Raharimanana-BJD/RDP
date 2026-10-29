// Mode séquentiel : lecture automatique pas à pas (libre ou scénario prédéfini).

import { useCallback, useEffect, useRef, useState } from 'react'
import { franchissables, marquagesEgaux, trouverTransition } from '../rdp/moteur'
import type { Scenario } from '../rdp/scenarios'
import type { Reseau, TransitionId } from '../rdp/types'
import type { ActionSimulation, EtatSimulation } from './simulation'

export type Politique = 'demander' | 'hasard'

export type Source = { type: 'libre' } | { type: 'scenario'; scenario: Scenario; index: number }

export interface EtatSequentiel {
  enLecture: boolean
  source: Source
  vitesseMs: number
  politique: Politique
  arretRetourInitial: boolean
  /** Jouer l'animation des jetons à chaque tir. */
  animerTirs: boolean
  /** Transitions entre lesquelles l'utilisateur doit choisir, sinon null. */
  choix: TransitionId[] | null
  message: string | null
  /** Nombre de tirs faits par la lecture libre en cours. */
  pasLibres: number
}

export function useSequentiel(
  reseau: Reseau,
  sim: EtatSimulation,
  dispatch: (a: ActionSimulation) => void,
) {
  const [seq, setSeq] = useState<EtatSequentiel>({
    enLecture: false,
    source: { type: 'libre' },
    vitesseMs: 900,
    politique: 'demander',
    arretRetourInitial: true,
    animerTirs: true,
    choix: null,
    message: null,
    pasLibres: 0,
  })

  const nom = useCallback((id: TransitionId) => trouverTransition(reseau, id).nom, [reseau])

  /** Calcule et applique un pas. Renvoie faux si la lecture doit s'arrêter. */
  const unPas = useCallback(() => {
    const m = sim.marquage
    if (seq.source.type === 'scenario') {
      const { scenario, index } = seq.source
      if (index >= scenario.sequence.length) {
        const libres = (m.A_libre ?? 0) === 1 && (m.B_libre ?? 0) === 1
        setSeq((s) => ({
          ...s,
          enLecture: false,
          message: libres
            ? `Scénario « ${scenario.nom} » terminé : les deux lignes sont disponibles.`
            : `Scénario « ${scenario.nom} » terminé.`,
        }))
        return
      }
      const t = scenario.sequence[index]
      dispatch({ type: 'tirer', transition: t, origine: 'sequentiel' })
      setSeq((s) => ({
        ...s,
        source: { type: 'scenario', scenario, index: index + 1 },
        message: `Pas ${index + 1}/${scenario.sequence.length} : ${nom(t)}`,
      }))
      return
    }

    const actives = franchissables(reseau, m).map((t) => t.id)
    if (actives.length === 0) {
      setSeq((s) => ({
        ...s,
        enLecture: false,
        message: 'Arrêt : plus aucune transition n’est franchissable (blocage).',
      }))
      return
    }
    if (seq.arretRetourInitial && seq.pasLibres > 0 && marquagesEgaux(m, reseau.marquageInitial)) {
      setSeq((s) => ({
        ...s,
        enLecture: false,
        pasLibres: 0,
        message: 'Arrêt : retour au marquage initial, le cycle d’appel est terminé.',
      }))
      return
    }
    if (actives.length === 1) {
      dispatch({ type: 'tirer', transition: actives[0], origine: 'sequentiel' })
      setSeq((s) => ({ ...s, pasLibres: s.pasLibres + 1, message: `Tir : ${nom(actives[0])}` }))
      return
    }
    if (seq.politique === 'hasard') {
      const t = actives[Math.floor(Math.random() * actives.length)]
      dispatch({ type: 'tirer', transition: t, origine: 'sequentiel' })
      setSeq((s) => ({
        ...s,
        pasLibres: s.pasLibres + 1,
        message: `Choix au hasard parmi ${actives.map(nom).join(', ')} : ${nom(t)}`,
      }))
      return
    }
    setSeq((s) => ({
      ...s,
      choix: actives,
      message: `Choix : ${actives.map(nom).join(' ou ')} ? Cliquez une transition en surbrillance.`,
    }))
  }, [dispatch, nom, reseau, seq, sim.marquage])

  // Minuterie de lecture : un pas toutes les `vitesseMs` tant qu'aucun choix n'est attendu.
  const unPasRef = useRef(unPas)
  useEffect(() => {
    unPasRef.current = unPas
  }, [unPas])
  useEffect(() => {
    if (!seq.enLecture || seq.choix) return
    const id = setTimeout(() => unPasRef.current(), seq.vitesseMs)
    return () => clearTimeout(id)
  }, [seq.enLecture, seq.choix, seq.vitesseMs, sim.marquage, seq.source])

  return {
    seq,
    lire: () =>
      setSeq((s) => ({
        ...s,
        enLecture: true,
        message: s.source.type === 'libre' ? 'Lecture automatique…' : s.message,
      })),
    pause: () => setSeq((s) => ({ ...s, enLecture: false, message: 'En pause.' })),
    pasAPas: () => {
      if (!seq.choix) unPas()
    },
    choisir: (t: TransitionId) => {
      if (!seq.choix?.includes(t)) return
      dispatch({ type: 'tirer', transition: t, origine: 'sequentiel' })
      setSeq((s) => ({
        ...s,
        choix: null,
        pasLibres: s.pasLibres + 1,
        message: `Choix : ${nom(t)}`,
      }))
    },
    lancerScenario: (scenario: Scenario) => {
      dispatch({ type: 'reinitialiser' })
      setSeq((s) => ({
        ...s,
        enLecture: true,
        choix: null,
        source: { type: 'scenario', scenario, index: 0 },
        message: `Scénario « ${scenario.nom} » : départ du marquage initial.`,
      }))
    },
    modeLibre: () =>
      setSeq((s) => ({
        ...s,
        enLecture: false,
        choix: null,
        source: { type: 'libre' },
        pasLibres: 0,
        message: null,
      })),
    reglages: (
      r: Partial<
        Pick<EtatSequentiel, 'vitesseMs' | 'politique' | 'arretRetourInitial' | 'animerTirs'>
      >,
    ) => setSeq((s) => ({ ...s, ...r })),
    /** À appeler quand l'utilisateur agit à la main (tir, annuler, réinitialiser). */
    interrompre: () =>
      setSeq((s) => ({
        ...s,
        enLecture: false,
        choix: null,
        source: { type: 'libre' },
        pasLibres: 0,
        message: null,
      })),
  }
}
