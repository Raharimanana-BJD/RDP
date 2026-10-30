// Dessin du réseau avec Cytoscape : places en cercles (avec leurs jetons),
// transitions en barres, arcs fléchés. Les positions viennent du modèle.

import cytoscape from 'cytoscape'
import { useEffect, useRef } from 'react'
import { trouverTransition } from '../rdp/moteur'
import type { Marquage, Reseau, TransitionId } from '../rdp/types'
import type { EntreeHistorique } from '../state/simulation'
import {
  adoucir,
  dureeAnimation,
  marquageIntermediaire,
  phaseA,
  pointSurArc,
  type Phase,
  type Point,
} from './animationTir'
import { POLICE, quandPoliceChargee } from './police'

const COULEUR_LIGNE = { A: '#2563eb', B: '#9333ea', 'A+B': '#0d9488' } as const

// Mêmes valeurs que `src/index.css` (Cytoscape dessine sur un canvas, sans variables CSS).
const ENCRE = '#111111'
const FOND = '#fff6e5'

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
            .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${ENCRE}"/>`)
            .join('')
        : `<text x="30" y="37" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="${ENCRE}">${n}</text>`
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
      'border-width': 5,
      'border-color': 'data(couleur)',
      'outline-width': 2,
      'outline-color': ENCRE,
      'outline-offset': 0,
      'background-image': 'data(image)',
      'background-width': '100%',
      'background-height': '100%',
      label: 'data(nom)',
      'text-valign': 'bottom',
      'text-margin-y': 6,
      'font-family': POLICE,
      'font-size': 13,
      'font-weight': 700,
      color: ENCRE,
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      'text-background-color': FOND,
      'text-background-opacity': 1,
      'text-background-padding': '3px',
    },
  },
  {
    selector: 'node.transition',
    style: {
      shape: 'rectangle',
      width: 14,
      height: 50,
      'background-color': '#9a9a9a',
      'border-width': 2,
      'border-color': ENCRE,
      label: 'data(nom)',
      'text-valign': 'top',
      'text-margin-y': -4,
      'font-family': POLICE,
      'font-size': 12,
      'font-weight': 500,
      color: ENCRE,
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      'text-background-color': '#ffffff',
      'text-background-opacity': 1,
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
      'background-color': '#22c55e',
      'border-width': 3,
      'border-color': ENCRE,
      'font-weight': 700,
      'text-background-color': '#bbf7d0',
    },
  },
  {
    selector: 'node.conflit',
    style: { 'background-color': '#ff8a3d', 'text-background-color': '#ffd8b8' },
  },
  // Avant `choix` : le survol ne doit pas cacher le fond jaune d'une transition à choisir.
  {
    selector: 'node.survol',
    style: { 'underlay-color': ENCRE, 'underlay-opacity': 0.15, 'underlay-padding': 8 },
  },
  {
    selector: 'node.choix',
    style: {
      'border-width': 3,
      'underlay-color': '#ffd23f',
      'underlay-opacity': 1,
      'underlay-padding': 6,
      'underlay-shape': 'round-rectangle',
    },
  },
  {
    selector: 'node.inactif',
    style: { 'background-opacity': 0.4, 'border-opacity': 0.4 },
  },
  {
    selector: 'node.derniere',
    style: {
      'background-color': '#ff4d4d',
      'border-color': ENCRE,
      'border-width': 3,
      'text-background-color': '#ffc9c9',
      'background-opacity': 1,
      'border-opacity': 1,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2.5,
      'line-color': ENCRE,
      'target-arrow-color': ENCRE,
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.2,
      'curve-style': 'bezier',
      label: 'data(poids)',
      'font-family': POLICE,
      'font-size': 12,
      'font-weight': 700,
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
      'line-dash-pattern': [8, 5],
      'line-color': '#6b6b6b',
      'target-arrow-color': '#6b6b6b',
    },
  },
  {
    selector: 'edge.derniere',
    style: { 'line-color': '#ff4d4d', 'target-arrow-color': '#ff4d4d', width: 4 },
  },
  // Animation d'un tir : après `derniere` pour l'emporter.
  {
    selector: 'node.en-tir',
    style: {
      'background-color': '#ffd23f',
      'border-color': ENCRE,
      'border-width': 3,
      'underlay-color': '#ffd23f',
      'underlay-opacity': 0.6,
      'underlay-padding': 10,
      'background-opacity': 1,
      'border-opacity': 1,
    },
  },
  {
    selector: 'edge.en-cours',
    style: { 'line-color': '#e0a800', 'target-arrow-color': '#e0a800', width: 4.5 },
  },
  {
    selector: 'node.jeton-anim',
    style: {
      shape: 'ellipse',
      width: 14,
      height: 14,
      'background-color': ENCRE,
      'border-width': 2,
      'border-color': '#ffd23f',
      label: '',
      events: 'no',
      'z-index-compare': 'manual',
      'z-index': 999,
    },
  },
]

/**
 * Met le graphe en accord avec les props. `figer` laisse en place les images des places
 * et la classe `derniere` : l'animation d'un tir s'en occupe tant qu'elle joue.
 */
function rafraichir(cy: cytoscape.Core, props: Props, figer: boolean) {
  const { reseau, marquage, franchissables, enConflit, choix, derniere, verrouille } = props
  cy.batch(() => {
    for (const t of reseau.transitions) {
      const n = cy.getElementById(t.id)
      const actif = choix ? choix.includes(t.id) : franchissables.has(t.id) && !verrouille
      n.toggleClass('franchissable', franchissables.has(t.id))
      n.toggleClass('conflit', franchissables.has(t.id) && enConflit.has(t.id))
      n.toggleClass('choix', !!choix?.includes(t.id))
      n.toggleClass('inactif', !actif)
    }
    if (figer) return
    dessinerMarquage(cy, reseau, marquage)
    for (const t of reseau.transitions) {
      cy.getElementById(t.id).toggleClass('derniere', t.id === derniere)
    }
    cy.edges().removeClass('derniere')
    if (derniere) cy.getElementById(derniere).connectedEdges().addClass('derniere')
  })
}

function dessinerMarquage(cy: cytoscape.Core, reseau: Reseau, m: Marquage) {
  for (const p of reseau.places) {
    cy.getElementById(p.id).data('image', imageJetons(m[p.id] ?? 0))
  }
}

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

/** Un arc parcouru par un jeton : son id et son tracé (repère du graphe). */
interface Chemin {
  arc: string
  points: Point[]
}

interface AnimationEnCours {
  tir: EntreeHistorique
  debut: number
  dureeMs: number
  rafId: number
  phase: Phase | null
  entrees: Chemin[]
  sorties: Chemin[]
  jetons: cytoscape.NodeSingular[]
}

/** Tracé d'un arc tel que Cytoscape le dessine, ou null s'il n'est pas encore calculé. */
function cheminArc(cy: cytoscape.Core, id: string): Chemin | null {
  const e = cy.getElementById(id)
  if (e.empty()) return null
  const points = [e.sourceEndpoint(), ...(e.controlPoints() ?? []), e.targetEndpoint()]
  if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null
  return { arc: id, points: points.map((p) => ({ x: p.x, y: p.y })) }
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
  /** Dernier tir de l'historique : un numéro plus grand que le précédent lance l'animation. */
  tir: EntreeHistorique | null
  vitesseMs: number
  animer: boolean
  onTransition: (id: TransitionId) => void
  onSurvol: (id: string | null) => void
}

export function GrapheReseau(props: Props) {
  const conteneur = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const animRef = useRef<AnimationEnCours | null>(null)
  // Le tir déjà affiché au montage n'est pas rejoué (retour depuis l'onglet Analyse).
  const dernierNumeroVu = useRef(props.tir?.numero ?? 0)
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
    quandPoliceChargee(() => cyRef.current?.style().update())

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
      if (animRef.current) cancelAnimationFrame(animRef.current.rafId)
      animRef.current = null
      cy.destroy()
      cyRef.current = null
    }
  }, [])

  // Mise à jour des jetons et des surbrillances à chaque changement.
  const { reseau, marquage, franchissables, enConflit, choix, derniere, verrouille } = props
  const { tir, animer } = props
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    // Un tir sur le point d'être animé : ne pas montrer son marquage final avant les jetons.
    const vaAnimer = animer && tir !== null && tir.numero > dernierNumeroVu.current
    rafraichir(cy, propsRef.current, vaAnimer || animRef.current !== null)
  }, [reseau, marquage, franchissables, enConflit, choix, derniere, verrouille, tir, animer])

  // Animation des tirs : couche visuelle seulement, le marquage est déjà à jour.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    const nettoyer = (a: AnimationEnCours) => {
      cy.remove('.jeton-anim')
      cy.edges('.en-cours').removeClass('en-cours')
      cy.getElementById(a.tir.transition).removeClass('en-tir')
      a.jetons = []
    }

    /** Arrête l'animation; `redessiner` faux quand un nouveau tir enchaîne aussitôt. */
    const terminer = (redessiner: boolean) => {
      const a = animRef.current
      if (!a) return
      cancelAnimationFrame(a.rafId)
      animRef.current = null
      cy.batch(() => nettoyer(a))
      if (redessiner) rafraichir(cy, propsRef.current, false)
    }

    const poserPhase = (a: AnimationEnCours, phase: Phase) => {
      nettoyer(a)
      a.phase = phase
      if (phase === 'barre') cy.getElementById(a.tir.transition).addClass('en-tir')
      const chemins = phase === 'entree' ? a.entrees : phase === 'sortie' ? a.sorties : []
      a.jetons = chemins.map((c, i) => {
        cy.getElementById(c.arc).addClass('en-cours')
        return cy.add({
          group: 'nodes',
          data: { id: `jeton-anim-${i}` },
          position: { ...c.points[0] },
          classes: 'jeton-anim',
        })
      })
    }

    const image = (maintenant: number) => {
      const a = animRef.current
      if (!a) return
      const { phase, progression } = phaseA(maintenant - a.debut, a.dureeMs)
      if (phase === 'fin') return terminer(true)
      cy.batch(() => {
        if (phase !== a.phase) poserPhase(a, phase)
        const chemins = phase === 'entree' ? a.entrees : phase === 'sortie' ? a.sorties : []
        const t = adoucir(progression)
        chemins.forEach((c, i) => a.jetons[i]?.position(pointSurArc(c.points, t)))
      })
      a.rafId = requestAnimationFrame(image)
    }

    const demarrer = (nouveau: EntreeHistorique) => {
      const { reseau, vitesseMs } = propsRef.current
      const t = trouverTransition(reseau, nouveau.transition)
      const chemins = (ids: string[]) =>
        ids.map((id) => cheminArc(cy, id)).filter((c): c is Chemin => c !== null)
      const a: AnimationEnCours = {
        tir: nouveau,
        debut: performance.now(),
        dureeMs: dureeAnimation(nouveau.origine, vitesseMs),
        rafId: 0,
        phase: null,
        entrees: chemins(t.entrees.map((e) => `${e.place}->${t.id}`)),
        sorties: chemins(t.sorties.map((e) => `${t.id}->${e.place}`)),
        jetons: [],
      }
      animRef.current = a
      cy.batch(() => {
        // Toutes les places : une animation interrompue a pu laisser un compte intermédiaire.
        dessinerMarquage(cy, reseau, marquageIntermediaire(t, nouveau.avant))
        cy.elements('.derniere').removeClass('derniere')
        poserPhase(a, 'entree')
      })
      a.rafId = requestAnimationFrame(image)
    }

    const nouveau = tir !== null && tir.numero > dernierNumeroVu.current
    dernierNumeroVu.current = tir?.numero ?? 0
    if (nouveau && animer) {
      terminer(false)
      demarrer(tir)
    } else if (animRef.current && (!animer || animRef.current.tir !== tir)) {
      // Annuler, Réinitialiser ou case décochée : on montre l'état réel tout de suite.
      terminer(true)
    }
  }, [tir, animer])

  return (
    <div className="graphe">
      <div ref={conteneur} className="graphe-canvas" aria-label="Graphe du réseau de Petri" />
      <button className="recentrer" onClick={() => cyRef.current?.fit(undefined, 40)}>
        Recentrer
      </button>
    </div>
  )
}
