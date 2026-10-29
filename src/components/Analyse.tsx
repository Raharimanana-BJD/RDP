// Page Analyse : matrices, graphe des marquages accessibles, propriétés.

import cytoscape from 'cytoscape'
import { useEffect, useMemo, useRef, useState } from 'react'
import { grapheAccessibilite, matrices, proprietes, verifierInvariants } from '../rdp/analyse'
import { decrireMarquage, marquagesEgaux, trouverTransition } from '../rdp/moteur'
import type { Marquage, Reseau } from '../rdp/types'

export function Analyse(props: { reseau: Reseau; marquage: Marquage }) {
  const { reseau } = props
  const g = useMemo(() => grapheAccessibilite(reseau), [reseau])
  const props_ = useMemo(() => proprietes(reseau, g), [reseau, g])
  const invariants = useMemo(() => verifierInvariants(reseau, g), [reseau, g])
  const courant = g.etats.find((e) => marquagesEgaux(e.marquage, props.marquage))?.id ?? null

  return (
    <div className="analyse">
      <section className="panneau">
        <h2>Propriétés du réseau</h2>
        <ul className="proprietes">
          {props_.map((p) => (
            <li key={p.nom} className={p.vraie ? 'vrai' : 'faux'}>
              <span className="badge">{p.vraie ? 'Vrai' : 'Faux'}</span>
              <div>
                <strong>{p.nom}</strong>
                <p>{p.explication}</p>
              </div>
            </li>
          ))}
          {invariants.map((r) => {
            const ok = r.structurel && r.verifieSurGraphe
            return (
              <li key={r.invariant.nom} className={ok ? 'vrai' : 'faux'}>
                <span className="badge">{ok ? 'Vrai' : 'Faux'}</span>
                <div>
                  <strong>Invariant : {r.invariant.nom}</strong>
                  <p>
                    {r.invariant.description}{' '}
                    <code>
                      {reseau.places
                        .filter((p) => r.invariant.poids[p.id])
                        .map((p) => `m(${p.nom})`)
                        .join(' + ')}{' '}
                      = {r.valeur}
                    </code>
                    . {r.structurel ? 'Prouvé par la matrice (x · C = 0)' : 'x · C ≠ 0'} et{' '}
                    {r.verifieSurGraphe
                      ? `vérifié sur les ${g.etats.length} marquages accessibles.`
                      : 'contredit par un marquage accessible.'}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <MatricesIncidence reseau={reseau} />

      <section className="panneau">
        <h2>Graphe des marquages accessibles</h2>
        <p className="aide">
          {g.etats.length} marquages, {g.arcs.length} arcs. M0 est le marquage initial ; le marquage
          courant de la simulation est entouré en rouge. Survolez un marquage pour le lire.
        </p>
        <GrapheMarquages reseau={reseau} courant={courant} />
      </section>
    </div>
  )
}

function MatricesIncidence({ reseau }: { reseau: Reseau }) {
  const { pre, post, c } = useMemo(() => matrices(reseau), [reseau])
  const [choix, setChoix] = useState<'c' | 'pre' | 'post'>('c')
  const m = { c, pre, post }[choix]
  return (
    <section className="panneau">
      <div className="titre-avec-actions">
        <h2>Matrice d’incidence</h2>
        <div className="onglets-petits">
          {(['c', 'pre', 'post'] as const).map((k) => (
            <button key={k} className={k === choix ? 'actif' : ''} onClick={() => setChoix(k)}>
              {k === 'c' ? 'C = Post − Pre' : k === 'pre' ? 'Pre' : 'Post'}
            </button>
          ))}
        </div>
      </div>
      <div className="table-defilante">
        <table className="matrice">
          <thead>
            <tr>
              <th />
              {reseau.transitions.map((t, j) => (
                <th key={t.id} title={t.nom}>
                  T{j + 1}
                  <span>{t.nom}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reseau.places.map((p, i) => (
              <tr key={p.id}>
                <th>
                  P{i + 1} <span>{p.nom}</span>
                </th>
                {m[i].map((v, j) => (
                  <td key={j} className={v > 0 ? 'positif' : v < 0 ? 'negatif' : 'zero'}>
                    {v > 0 && choix === 'c' ? `+${v}` : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="aide">
        Ligne = place, colonne = transition. Dans C, −1 : la transition retire un jeton de la place,
        +1 : elle en ajoute un. La transition « Refuser (occupé) » lit la place « B en communication
        (tiers) » sans la vider : elle apparaît dans Pre et Post mais vaut 0 dans C.
      </p>
    </section>
  )
}

function GrapheMarquages({ reseau, courant }: { reseau: Reseau; courant: number | null }) {
  const conteneur = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [survol, setSurvol] = useState<string | null>(null)
  const g = useMemo(() => grapheAccessibilite(reseau), [reseau])

  useEffect(() => {
    const cy = cytoscape({
      container: conteneur.current,
      elements: [
        ...g.etats.map((e) => ({
          group: 'nodes' as const,
          data: { id: `M${e.id}`, label: `M${e.id}`, texte: decrireMarquage(reseau, e.marquage) },
          classes: e.id === 0 ? 'initial' : '',
        })),
        ...g.arcs.map((a, i) => ({
          group: 'edges' as const,
          data: {
            id: `a${i}`,
            source: `M${a.de}`,
            target: `M${a.vers}`,
            label: trouverTransition(reseau, a.transition).nom,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'center',
            'font-size': 13,
            'font-weight': 700,
            width: 44,
            height: 44,
            'background-color': '#e0f2fe',
            'border-width': 2,
            'border-color': '#0369a1',
          },
        },
        {
          selector: 'node.initial',
          style: { 'background-color': '#bbf7d0', 'border-color': '#15803d' },
        },
        { selector: 'node.courant', style: { 'border-width': 5, 'border-color': '#dc2626' } },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            label: 'data(label)',
            'font-size': 10,
            color: '#475569',
            'text-rotation': 'autorotate',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.85,
          },
        },
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        roots: ['M0'],
        spacingFactor: 1.25,
        padding: 30,
      },
      autoungrabify: false,
      boxSelectionEnabled: false,
      wheelSensitivity: 0.3,
    })
    cy.on('mouseover', 'node', (e) => setSurvol(`${e.target.id()} : ${e.target.data('texte')}`))
    cy.on('mouseout', 'node', () => setSurvol(null))
    cyRef.current = cy
    const observateur = new ResizeObserver(() => {
      cy.resize()
      cy.fit(undefined, 30)
    })
    if (conteneur.current) observateur.observe(conteneur.current)
    return () => {
      observateur.disconnect()
      cy.destroy()
    }
  }, [g, reseau])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.nodes().removeClass('courant')
    if (courant !== null) cy.getElementById(`M${courant}`).addClass('courant')
  }, [courant, g])

  return (
    <>
      <div ref={conteneur} className="graphe-marquages" />
      <p className="info-element">
        {survol ?? 'Survolez un marquage pour voir les places marquées.'}
      </p>
    </>
  )
}
