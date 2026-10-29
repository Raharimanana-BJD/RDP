// Dessin du réseau avec Cytoscape : places en cercles (avec leurs jetons),
// transitions en barres, arcs fléchés. Les positions viennent du modèle.

import cytoscape from 'cytoscape'
import { useEffect, useRef } from 'react'
import type { Marquage, Reseau, TransitionId } from '../rdp/types'

const COULEUR_LIGNE = { A: '#2563eb', B: '#9333ea', 'A+B': '#0d9488' } as const

/** Image SVG des jetons : de 1 à 4 points, au delà un nombre. */
function imageJetons(n: number): string {
  const positions: Record<number, [number, number][]> = {
    1: [[30, 30]],
    2: [
      [21, 30],
      [39, 30],
    ],
    3: [
      [30, 20],
      [20, 37],
      [40, 37],
    ],
    4: [
      [21, 21],
      [39, 21],
      [21, 39],
      [39, 39],
    ],
  }
  const contenu =
    n === 0
      ? ''
      : n <= 4
        ? positions[n]
            .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#0f172a"/>`)
            .join('')
        : `<text x="30" y="37" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#0f172a">${n}</text>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">${contenu}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const STYLE: cytoscape.StylesheetJson = [
  {
    selector: 'node.place',
    style: {
      shape: 'ellipse',
      width: 60,
      height: 60,
      'background-color': '#ffffff',
      'border-width': 3,
      'border-color': 'data(couleur)',
      'background-image': 'data(image)',
      'background-width': '100%',
      'background-height': '100%',
      label: 'data(nom)',
      'text-valign': 'bottom',
      'text-margin-y': 6,
      'font-size': 13,
      'font-weight': 600,
      color: '#1e293b',
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      'text-background-color': '#f8fafc',
      'text-background-opacity': 0.9,
      'text-background-padding': '2px',
    },
  },
  {
    selector: 'node.transition',
    style: {
      shape: 'rectangle',
      width: 14,
      height: 50,
      'background-color': '#64748b',
      label: 'data(nom)',
      'text-valign': 'top',
      'text-margin-y': -4,
      'font-size': 12,
      color: '#334155',
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      'text-background-color': '#f8fafc',
      'text-background-opacity': 0.9,
      'text-background-padding': '2px',
    },
  },
  {
    selector: 'node.etiquette-droite',
    style: {
      'text-valign': 'center',
      'text-halign': 'right',
      'text-margin-x': 6,
      'text-margin-y': 0,
    },
  },
  {
    selector: 'node.etiquette-bas',
    style: { 'text-valign': 'bottom', 'text-margin-y': 4 },
  },
  {
    selector: 'node.franchissable',
    style: {
      'background-color': '#16a34a',
      'border-width': 3,
      'border-color': '#bbf7d0',
      color: '#14532d',
      'font-weight': 700,
    },
  },
  {
    selector: 'node.conflit',
    style: { 'background-color': '#ea580c', 'border-color': '#fed7aa', color: '#7c2d12' },
  },
  {
    selector: 'node.choix',
    style: { 'border-width': 6, 'border-color': '#facc15' },
  },
  {
    selector: 'node.inactif',
    style: { opacity: 0.45 },
  },
  {
    selector: 'node.derniere',
    style: {
      'background-color': '#dc2626',
      'border-color': '#fecaca',
      'border-width': 3,
      opacity: 1,
    },
  },
  {
    selector: 'node.survol',
    style: { 'underlay-color': '#38bdf8', 'underlay-opacity': 0.25, 'underlay-padding': 8 },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.1,
      'curve-style': 'bezier',
      label: 'data(poids)',
      'font-size': 12,
      'text-background-color': '#ffffff',
      'text-background-opacity': 1,
    },
  },
  {
    selector: 'edge.retour',
    style: {
      'curve-style': 'unbundled-bezier',
      'control-point-distances': 'data(courbe)',
      'control-point-weights': 0.5,
      'line-style': 'dashed',
      'line-dash-pattern': [7, 4],
    },
  },
  {
    selector: 'edge.derniere',
    style: { 'line-color': '#dc2626', 'target-arrow-color': '#dc2626', width: 3.5 },
  },
]

/**
 * Arcs longs qui ramènent les lignes à l'état libre : tracés en pointillés et
 * courbés pour contourner le reste du graphe (distance du point de contrôle, en px).
 */
const ARCS_RETOUR: Record<string, number> = {
  't_raccrocher_A->A_libre': 330,
  't_raccrocher_B->A_libre': 380,
  't_raccrocher_A->B_libre': 30,
  't_raccrocher_B->B_libre': 60,
  't_delai->B_libre': 200,
  't_terminer_sans_reponse->A_libre': 200,
  't_terminer_occupee->A_libre': 0,
  't_tiers_fin->B_libre': 0,
}

/** Transitions dont l'étiquette va à droite ou en bas, pour ne pas chevaucher un arc. */
const ETIQUETTES: Record<string, 'droite' | 'bas'> = {
  t_etablir: 'droite',
  t_tiers_debut: 'droite',
  t_tiers_fin: 'droite',
  t_terminer_occupee: 'bas',
  t_delai: 'bas',
  t_terminer_sans_reponse: 'bas',
  t_raccrocher_B: 'bas',
}

interface Props {
  reseau: Reseau
  marquage: Marquage
  franchissables: Set<TransitionId>
  enConflit: Set<TransitionId>
  /** Transitions proposées au choix en mode séquentiel (null : pas de choix en attente). */
  choix: TransitionId[] | null
  derniere: TransitionId | null
  verrouille: boolean
  onTransition: (id: TransitionId) => void
  onSurvol: (id: string | null) => void
}

export function GrapheReseau(props: Props) {
  const conteneur = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })

  // Création du graphe une seule fois.
  useEffect(() => {
    const { reseau } = propsRef.current
    const elements: cytoscape.ElementDefinition[] = [
      ...reseau.places.map((p) => ({
        group: 'nodes' as const,
        data: { id: p.id, nom: p.nom, couleur: COULEUR_LIGNE[p.ligne], image: imageJetons(0) },
        position: { x: p.x, y: p.y },
        classes: 'place',
      })),
      ...reseau.transitions.map((t) => ({
        group: 'nodes' as const,
        data: { id: t.id, nom: t.nom },
        position: { x: t.x, y: t.y },
        classes: ETIQUETTES[t.id] ? `transition etiquette-${ETIQUETTES[t.id]}` : 'transition',
      })),
      ...reseau.transitions.flatMap((t) => [
        ...t.entrees.map((a) => ({
          group: 'edges' as const,
          data: {
            id: `${a.place}->${t.id}`,
            source: a.place,
            target: t.id,
            poids: a.poids > 1 ? String(a.poids) : '',
          },
        })),
        ...t.sorties.map((a) => {
          const id = `${t.id}->${a.place}`
          return {
            group: 'edges' as const,
            data: {
              id,
              source: t.id,
              target: a.place,
              poids: a.poids > 1 ? String(a.poids) : '',
              courbe: ARCS_RETOUR[id] ?? 0,
            },
            classes: id in ARCS_RETOUR ? 'retour' : '',
          }
        }),
      ]),
    ]

    const cy = cytoscape({
      container: conteneur.current,
      elements,
      style: STYLE,
      layout: { name: 'preset', padding: 40 },
      autoungrabify: true,
      boxSelectionEnabled: false,
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 0.3,
    })
    cyRef.current = cy

    cy.on('tap', 'node.transition', (e) => propsRef.current.onTransition(e.target.id()))
    cy.on('mouseover', 'node', (e) => {
      e.target.addClass('survol')
      propsRef.current.onSurvol(e.target.id())
      const cliquable = e.target.hasClass('transition') && !e.target.hasClass('inactif')
      if (conteneur.current) conteneur.current.style.cursor = cliquable ? 'pointer' : 'default'
    })
    cy.on('mouseout', 'node', (e) => {
      e.target.removeClass('survol')
      propsRef.current.onSurvol(null)
      if (conteneur.current) conteneur.current.style.cursor = 'default'
    })

    const recadrer = () => {
      cy.resize()
      cy.fit(undefined, 40)
    }
    const observateur = new ResizeObserver(recadrer)
    if (conteneur.current) observateur.observe(conteneur.current)
    return () => {
      observateur.disconnect()
      cy.destroy()
      cyRef.current = null
    }
  }, [])

  // Mise à jour des jetons et des surbrillances à chaque changement.
  const { reseau, marquage, franchissables, enConflit, choix, derniere, verrouille } = props
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.batch(() => {
      for (const p of reseau.places) {
        cy.getElementById(p.id).data('image', imageJetons(marquage[p.id] ?? 0))
      }
      for (const t of reseau.transitions) {
        const n = cy.getElementById(t.id)
        const actif = choix ? choix.includes(t.id) : franchissables.has(t.id) && !verrouille
        n.toggleClass('franchissable', franchissables.has(t.id))
        n.toggleClass('conflit', franchissables.has(t.id) && enConflit.has(t.id))
        n.toggleClass('choix', !!choix?.includes(t.id))
        n.toggleClass('inactif', !actif)
        n.toggleClass('derniere', t.id === derniere)
      }
      cy.edges().removeClass('derniere')
      if (derniere) cy.getElementById(derniere).connectedEdges().addClass('derniere')
    })
  }, [reseau, marquage, franchissables, enConflit, choix, derniere, verrouille])

  return (
    <div className="graphe">
      <div ref={conteneur} className="graphe-canvas" aria-label="Graphe du réseau de Petri" />
      <button className="recentrer" onClick={() => cyRef.current?.fit(undefined, 40)}>
        Recentrer
      </button>
    </div>
  )
}
