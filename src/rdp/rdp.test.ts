import { describe, expect, test } from 'bun:test'
import { grapheAccessibilite, matrices, proprietes, verifierInvariants } from './analyse'
import { conflits, franchissables, marquagesEgaux, tirer } from './moteur'
import { reseauAppels as r } from './reseau'
import { scenarios } from './scenarios'
import type { Marquage, Reseau } from './types'

const m0 = r.marquageInitial
const ids = (m: Marquage) =>
  franchissables(r, m)
    .map((t) => t.id)
    .sort()
const jouer = (seq: string[], m: Marquage = m0) => seq.reduce((acc, t) => tirer(r, acc, t), m)

describe('moteur de tir', () => {
  test('au départ, A peut composer et B peut appeler un tiers', () => {
    expect(ids(m0)).toEqual(['t_composer', 't_tiers_debut'])
  })

  test('tirer met à jour le marquage sans modifier l’original', () => {
    const m1 = tirer(r, m0, 't_composer')
    expect(m1.A_libre).toBe(0)
    expect(m1.A_compose).toBe(1)
    expect(m0.A_libre).toBe(1)
  })

  test('refuse une transition non franchissable', () => {
    expect(() => tirer(r, m0, 't_accepter')).toThrow('pas franchissable')
  })

  test('B disponible : seul l’établissement est possible', () => {
    expect(ids(jouer(['t_composer', 't_verifier']))).toEqual(['t_etablir', 't_tiers_debut'])
  })

  test('B occupé : seul le refus est possible', () => {
    expect(ids(jouer(['t_tiers_debut', 't_composer', 't_verifier']))).toEqual([
      't_refuser',
      't_tiers_fin',
    ])
  })

  test('conflit entre accepter et délai expiré pendant la sonnerie', () => {
    const m = jouer(['t_composer', 't_verifier', 't_etablir'])
    const c = conflits(r, m)
    expect(c).toEqual([
      { places: ['A_attente', 'B_sonne'], transitions: ['t_accepter', 't_delai'] },
    ])
  })

  test('conflit entre établir l’appel et B qui appelle un tiers', () => {
    const c = conflits(r, jouer(['t_composer', 't_verifier']))
    expect(c).toEqual([{ places: ['B_libre'], transitions: ['t_etablir', 't_tiers_debut'] }])
  })

  test('pendant la communication, aucune ligne ne peut recevoir d’appel', () => {
    const m = jouer(['t_composer', 't_verifier', 't_etablir', 't_accepter'])
    expect(m.A_libre).toBe(0)
    expect(m.B_libre).toBe(0)
    expect(ids(m)).toEqual(['t_raccrocher_A', 't_raccrocher_B'])
  })

  test('les transitions concurrentes sans place commune ne sont pas en conflit', () => {
    expect(conflits(r, m0)).toEqual([])
  })

  test('poids supérieurs à 1', () => {
    const petit: Reseau = {
      nom: 'test',
      places: [
        { id: 'p', nom: 'p', enonce: '', ligne: 'A', x: 0, y: 0 },
        { id: 'q', nom: 'q', enonce: '', ligne: 'A', x: 0, y: 0 },
      ],
      transitions: [
        {
          id: 't',
          nom: 't',
          enonce: '',
          entrees: [{ place: 'p', poids: 2 }],
          sorties: [{ place: 'q', poids: 3 }],
          x: 0,
          y: 0,
        },
      ],
      marquageInitial: { p: 1, q: 0 },
      invariants: [],
    }
    expect(franchissables(petit, { p: 1, q: 0 })).toEqual([])
    expect(tirer(petit, { p: 2, q: 0 }, 't')).toEqual({ p: 0, q: 3 })
  })
})

describe('scénarios', () => {
  for (const s of scenarios) {
    test(`${s.nom} se rejoue et finit avec les deux lignes disponibles`, () => {
      const fin = jouer(s.sequence)
      expect(marquagesEgaux(fin, m0)).toBe(true)
    })
  }
})

describe('analyse', () => {
  const g = grapheAccessibilite(r)

  test('matrice d’incidence : C = Post − Pre', () => {
    const { c } = matrices(r)
    const i = r.places.findIndex((p) => p.id === 'A_libre')
    const j = r.transitions.findIndex((t) => t.id === 't_composer')
    expect(c[i][j]).toBe(-1)
    // Boucle de lecture : t_refuser consomme et rend B_tiers, donc 0 dans C.
    const k = r.places.findIndex((p) => p.id === 'B_tiers')
    const l = r.transitions.findIndex((t) => t.id === 't_refuser')
    expect(c[k][l]).toBe(0)
  })

  test('graphe des marquages fini', () => {
    expect(g.complet).toBe(true)
    expect(g.etats.length).toBeGreaterThan(5)
  })

  test('le réseau est borné, sans blocage, réversible et vivant', () => {
    const p = Object.fromEntries(proprietes(r, g).map((x) => [x.nom, x.vraie]))
    expect(p).toEqual({ Borné: true, 'Sans blocage': true, Réversible: true, Vivant: true })
  })

  test('une ligne n’est jamais dans deux états à la fois', () => {
    for (const res of verifierInvariants(r, g)) {
      expect(res.structurel).toBe(true)
      expect(res.verifieSurGraphe).toBe(true)
      expect(res.valeur).toBe(1)
    }
  })

  test('détecte un blocage', () => {
    const bloque: Reseau = {
      ...r,
      transitions: r.transitions.filter(
        (t) => !['t_terminer_occupee', 't_tiers_fin'].includes(t.id),
      ),
    }
    const p = proprietes(bloque, grapheAccessibilite(bloque))
    expect(p.find((x) => x.nom === 'Sans blocage')?.vraie).toBe(false)
    expect(p.find((x) => x.nom === 'Vivant')?.vraie).toBe(false)
  })
})
