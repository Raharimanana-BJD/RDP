// Panneaux latéraux de la page Simulation.

import { decrireMarquage, trouverTransition, vecteurMarquage, type Conflit } from '../rdp/moteur'
import { scenarios } from '../rdp/scenarios'
import type { Marquage, Reseau, TransitionId } from '../rdp/types'
import type { EntreeHistorique } from '../state/simulation'
import type { EtatSequentiel } from '../state/useSequentiel'

export function PanneauEtat(props: {
  reseau: Reseau
  marquage: Marquage
  franchissables: TransitionId[]
  conflits: Conflit[]
  verrouille: boolean
  onTirer: (t: TransitionId) => void
}) {
  const { reseau, marquage } = props
  const nomP = (id: string) => reseau.places.find((p) => p.id === id)?.nom ?? id
  return (
    <section className="panneau">
      <h2>Marquage courant</h2>
      <p className="marquage-texte">{decrireMarquage(reseau, marquage)}</p>
      <p className="vecteur" title={reseau.places.map((p) => p.nom).join(', ')}>
        M = {vecteurMarquage(reseau, marquage)}
      </p>
      <h3>Transitions franchissables</h3>
      {props.franchissables.length === 0 ? (
        <p className="vide">Aucune : blocage.</p>
      ) : (
        <div className="boutons-transitions">
          {props.franchissables.map((t) => (
            <button
              key={t}
              className="bouton-transition"
              disabled={props.verrouille}
              onClick={() => props.onTirer(t)}
            >
              {trouverTransition(reseau, t).nom}
            </button>
          ))}
        </div>
      )}
      {props.conflits.length > 0 && (
        <div className="alerte-conflit">
          <strong>Conflit</strong>
          {props.conflits.map((c) => (
            <p key={c.transitions.join()}>
              {c.transitions.map((t) => `« ${trouverTransition(reseau, t).nom} »`).join(' et ')} se
              disputent {c.places.length > 1 ? 'les jetons de' : 'le jeton de'}{' '}
              <em>{c.places.map(nomP).join(' et ')}</em> : tirer l’une désactive l’autre.
            </p>
          ))}
        </div>
      )}
    </section>
  )
}

export function PanneauSequentiel(props: {
  seq: EtatSequentiel
  lire: () => void
  pause: () => void
  pasAPas: () => void
  modeLibre: () => void
  lancerScenario: (id: string) => void
  reglages: (
    r: Partial<
      Pick<EtatSequentiel, 'vitesseMs' | 'politique' | 'arretRetourInitial' | 'animerTirs'>
    >,
  ) => void
}) {
  const { seq } = props
  const scenarioActif = seq.source.type === 'scenario' ? seq.source.scenario.id : null
  return (
    <section className="panneau">
      <h2>Mode séquentiel</h2>
      <div className="scenarios">
        {scenarios.map((s) => (
          <button
            key={s.id}
            className={scenarioActif === s.id ? 'scenario actif' : 'scenario'}
            title={s.description}
            onClick={() => props.lancerScenario(s.id)}
          >
            ▶ {s.nom}
          </button>
        ))}
      </div>
      <div className="ligne-controles">
        {seq.enLecture ? (
          <button onClick={props.pause}>⏸ Pause</button>
        ) : (
          <button onClick={props.lire}>
            ▶ {scenarioActif ? 'Reprendre le scénario' : 'Lecture automatique'}
          </button>
        )}
        <button onClick={props.pasAPas} disabled={!!seq.choix}>
          ⏭ Pas à pas
        </button>
        {scenarioActif && <button onClick={props.modeLibre}>Quitter le scénario</button>}
      </div>
      <label className="reglage">
        Vitesse : {(seq.vitesseMs / 1000).toFixed(1)} s par pas
        <input
          type="range"
          min={200}
          max={2500}
          step={100}
          value={2700 - seq.vitesseMs}
          onChange={(e) => props.reglages({ vitesseMs: 2700 - Number(e.target.value) })}
        />
      </label>
      <label className="reglage reglage-case">
        <input
          type="checkbox"
          checked={seq.animerTirs}
          onChange={(e) => props.reglages({ animerTirs: e.target.checked })}
        />
        Animer les tirs
      </label>
      <fieldset className="reglage" disabled={!!scenarioActif}>
        <legend>En cas de choix entre plusieurs transitions</legend>
        <label>
          <input
            type="radio"
            checked={seq.politique === 'demander'}
            onChange={() => props.reglages({ politique: 'demander' })}
          />
          Me demander
        </label>
        <label>
          <input
            type="radio"
            checked={seq.politique === 'hasard'}
            onChange={() => props.reglages({ politique: 'hasard' })}
          />
          Choisir au hasard
        </label>
        <label>
          <input
            type="checkbox"
            checked={seq.arretRetourInitial}
            onChange={(e) => props.reglages({ arretRetourInitial: e.target.checked })}
          />
          S’arrêter au retour au marquage initial
        </label>
      </fieldset>
      {seq.message && (
        <p className={seq.choix ? 'message message-choix' : 'message'} role="status">
          {seq.message}
        </p>
      )}
    </section>
  )
}

export function Historique(props: {
  reseau: Reseau
  historique: EntreeHistorique[]
  onAnnuler: () => void
  onReinitialiser: () => void
}) {
  const { reseau, historique } = props
  return (
    <section className="panneau">
      <div className="titre-avec-actions">
        <h2>Historique des tirs</h2>
        <div>
          <button onClick={props.onAnnuler} disabled={historique.length === 0}>
            ↶ Annuler
          </button>
          <button onClick={props.onReinitialiser}>⟲ Réinitialiser</button>
        </div>
      </div>
      {historique.length === 0 ? (
        <p className="vide">
          Aucun tir. Marquage initial M0 : {decrireMarquage(reseau, reseau.marquageInitial)}.
        </p>
      ) : (
        <ol className="historique">
          {[...historique].reverse().map((h) => (
            <li key={h.numero}>
              <span className="numero">{h.numero}</span>
              <span>
                <strong>{trouverTransition(reseau, h.transition).nom}</strong>
                <br />
                <small>→ {decrireMarquage(reseau, h.apres)}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function InfoElement(props: { reseau: Reseau; id: string | null }) {
  const { reseau, id } = props
  const place = reseau.places.find((p) => p.id === id)
  const transition = reseau.transitions.find((t) => t.id === id)
  const nomP = (pid: string) => reseau.places.find((p) => p.id === pid)?.nom ?? pid
  if (!place && !transition) {
    return (
      <div className="info-element vide">
        Survolez une place ou une transition pour voir la phrase de l’énoncé qu’elle représente.
        Cliquez une transition verte pour la tirer.
      </div>
    )
  }
  return (
    <div className="info-element">
      <strong>{place ? `Place ${place.nom}` : `Transition ${transition!.nom}`}</strong>
      <span>« {(place ?? transition)!.enonce} »</span>
      {transition && (
        <small>
          Consomme : {transition.entrees.map((a) => nomP(a.place)).join(', ')} · Produit :{' '}
          {transition.sorties.map((a) => nomP(a.place)).join(', ')}
        </small>
      )}
    </div>
  )
}
