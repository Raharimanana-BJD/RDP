import { describe, expect, test } from 'bun:test'
import { trouverTransition } from '../rdp/moteur'
import { reseauAppels as r } from '../rdp/reseau'
import type { Marquage } from '../rdp/types'
import { adoucir, dureeAnimation, marquageIntermediaire, phaseA, pointSurArc } from './animationTir'

describe('animation des tirs', () => {
  test('durée : 700 ms au clic, 75 % du pas en séquentiel', () => {
    expect(dureeAnimation('manuel', 2500)).toBe(700)
    expect(dureeAnimation('sequentiel', 200)).toBe(150)
    expect(dureeAnimation('sequentiel', 2500)).toBe(1875)
  })

  test('phases 40 / 20 / 40 puis fin', () => {
    expect(phaseA(0, 1000)).toEqual({ phase: 'entree', progression: 0 })
    expect(phaseA(200, 1000)).toEqual({ phase: 'entree', progression: 0.5 })
    expect(phaseA(400, 1000)).toEqual({ phase: 'barre', progression: 0 })
    expect(phaseA(500, 1000).phase).toBe('barre')
    expect(phaseA(600, 1000)).toEqual({ phase: 'sortie', progression: 0 })
    expect(phaseA(1000, 1000)).toEqual({ phase: 'fin', progression: 1 })
    expect(phaseA(5000, 1000).phase).toBe('fin')
    expect(phaseA(0, 0).phase).toBe('fin')
  })

  test('adoucir garde les bornes et le milieu', () => {
    expect(adoucir(0)).toBe(0)
    expect(adoucir(0.5)).toBe(0.5)
    expect(adoucir(1)).toBe(1)
  })

  test('point sur un arc droit', () => {
    const arc = [
      { x: 0, y: 0 },
      { x: 100, y: 50 },
    ]
    expect(pointSurArc(arc, 0)).toEqual({ x: 0, y: 0 })
    expect(pointSurArc(arc, 0.5)).toEqual({ x: 50, y: 25 })
    expect(pointSurArc(arc, 1)).toEqual({ x: 100, y: 50 })
  })

  test('point sur un arc courbé (Bezier quadratique)', () => {
    const arc = [
      { x: 0, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 0 },
    ]
    expect(pointSurArc(arc, 0)).toEqual({ x: 0, y: 0 })
    expect(pointSurArc(arc, 0.5)).toEqual({ x: 50, y: 50 })
    expect(pointSurArc(arc, 1)).toEqual({ x: 100, y: 0 })
  })

  test('point sur une ligne brisée', () => {
    const arc = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
    ]
    expect(pointSurArc(arc, 0.5)).toEqual({ x: 10, y: 5 })
    expect(pointSurArc(arc, 1)).toEqual({ x: 20, y: 10 })
  })

  test('compte intermédiaire de t_refuser : B_tiers se vide sans modifier l’entrée', () => {
    const avant: Marquage = { ...r.marquageInitial, verification: 1, B_tiers: 1, A_libre: 0 }
    const copie = { ...avant }
    const m = marquageIntermediaire(trouverTransition(r, 't_refuser'), avant)
    expect(m.verification).toBe(0)
    expect(m.B_tiers).toBe(0)
    expect(m.ligne_occupee ?? 0).toBe(0)
    expect(avant).toEqual(copie)
  })
})
