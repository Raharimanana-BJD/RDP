import { useMemo, useReducer, useState } from 'react'
import { Analyse } from './components/Analyse'
import { GrapheReseau } from './components/GrapheReseau'
import { Historique, InfoElement, PanneauEtat, PanneauSequentiel } from './components/Panneaux'
import { conflits, franchissables } from './rdp/moteur'
import { reseauAppels } from './rdp/reseau'
import { scenarios } from './rdp/scenarios'
import { creerReducer, etatInitial } from './state/simulation'
import { useSequentiel } from './state/useSequentiel'

const reseau = reseauAppels
const reducer = creerReducer(reseau)

export default function App() {
  const [onglet, setOnglet] = useState<'simulation' | 'analyse'>('simulation')
  const [sim, dispatch] = useReducer(reducer, reseau, etatInitial)
  const [survol, setSurvol] = useState<string | null>(null)
  const sequentiel = useSequentiel(reseau, sim, dispatch)
  const { seq } = sequentiel

  const actives = useMemo(
    () => franchissables(reseau, sim.marquage).map((t) => t.id),
    [sim.marquage],
  )
  const ensembleActives = useMemo(() => new Set(actives), [actives])
  const listeConflits = useMemo(() => conflits(reseau, sim.marquage), [sim.marquage])
  const enConflit = useMemo(
    () => new Set(listeConflits.flatMap((c) => c.transitions)),
    [listeConflits],
  )
  // Pendant la lecture d'un scénario, les clics sur le graphe sont bloqués.
  const verrouille = seq.enLecture && !seq.choix

  const tirerManuel = (t: string) => {
    if (seq.choix) return sequentiel.choisir(t)
    if (verrouille || !actives.includes(t)) return
    if (seq.source.type === 'scenario') sequentiel.interrompre()
    dispatch({ type: 'tirer', transition: t, origine: 'manuel' })
  }

  return (
    <div className="app">
      <header className="entete">
        <div>
          <h1>Simulateur de Réseau de Petri</h1>
          <p>
            Gestion d’un appel téléphonique entre A (appelant) et B (appelé) : appel réussi et appel
            échoué
          </p>
        </div>
        <nav className="onglets">
          <button
            className={onglet === 'simulation' ? 'actif' : ''}
            onClick={() => setOnglet('simulation')}
          >
            Simulation
          </button>
          <button
            className={onglet === 'analyse' ? 'actif' : ''}
            onClick={() => setOnglet('analyse')}
          >
            Analyse
          </button>
        </nav>
      </header>

      {onglet === 'simulation' ? (
        <main className="simulation">
          <div className="zone-graphe">
            <GrapheReseau
              reseau={reseau}
              marquage={sim.marquage}
              franchissables={ensembleActives}
              enConflit={enConflit}
              choix={seq.choix}
              derniere={sim.historique.at(-1)?.transition ?? null}
              verrouille={verrouille}
              tir={sim.historique.at(-1) ?? null}
              vitesseMs={seq.vitesseMs}
              animer={seq.animerTirs}
              onTransition={tirerManuel}
              onSurvol={setSurvol}
            />
            <InfoElement reseau={reseau} id={survol} />
            <Legende />
          </div>
          <aside className="cote">
            <PanneauEtat
              reseau={reseau}
              marquage={sim.marquage}
              franchissables={seq.choix ?? actives}
              conflits={listeConflits}
              verrouille={verrouille}
              onTirer={tirerManuel}
            />
            <PanneauSequentiel
              seq={seq}
              lire={sequentiel.lire}
              pause={sequentiel.pause}
              pasAPas={sequentiel.pasAPas}
              modeLibre={sequentiel.modeLibre}
              lancerScenario={(id) =>
                sequentiel.lancerScenario(scenarios.find((s) => s.id === id)!)
              }
              reglages={sequentiel.reglages}
            />
            <Historique
              reseau={reseau}
              historique={sim.historique}
              onAnnuler={() => {
                sequentiel.interrompre()
                dispatch({ type: 'annuler' })
              }}
              onReinitialiser={() => {
                sequentiel.interrompre()
                dispatch({ type: 'reinitialiser' })
              }}
            />
          </aside>
        </main>
      ) : (
        <main>
          <Analyse reseau={reseau} marquage={sim.marquage} />
        </main>
      )}
    </div>
  )
}

function Legende() {
  return (
    <ul className="legende">
      <li>
        <span className="pastille place-a" /> Place de la ligne A
      </li>
      <li>
        <span className="pastille place-b" /> Place de la ligne B
      </li>
      <li>
        <span className="pastille place-ab" /> Place commune (A et B)
      </li>
      <li>
        <span className="barre franchissable" /> Franchissable (cliquer pour tirer)
      </li>
      <li>
        <span className="barre conflit" /> Franchissable, en conflit
      </li>
      <li>
        <span className="barre en-tir" /> Transition en cours de tir
      </li>
      <li>
        <span className="barre derniere" /> Dernière transition tirée
      </li>
      <li>
        <span className="trait-pointille" /> Retour à l’état libre
      </li>
    </ul>
  )
}
