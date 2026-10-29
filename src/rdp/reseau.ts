// Le réseau combiné : appel réussi (système 1) et appel échoué (système 2),
// entre l'utilisateur A (appelant) et l'utilisateur B (appelé).
//
// Chaque ligne est un « jeton de ligne » qui circule entre les places de sa ligne :
//   ligne A : A_libre, A_compose, verification, A_attente, communication,
//             ligne_occupee, pas_de_reponse
//   ligne B : B_libre, B_sonne, communication, B_tiers
// La place `communication` appartient aux deux lignes : les deux sont prises
// pendant la communication, aucune ne peut donc recevoir un autre appel.
//
// Pour reproduire « le correspondant est déjà en communication » avec seulement
// deux utilisateurs, B peut être en communication avec un tiers extérieur
// (place B_tiers), ce qui rend sa ligne indisponible.

import type { Reseau } from './types'

const arc = (place: string, poids = 1) => ({ place, poids })

export const reseauAppels: Reseau = {
  nom: 'Appels téléphoniques A → B',
  places: [
    {
      id: 'A_libre',
      nom: 'A libre',
      ligne: 'A',
      enonce: 'Le téléphone de l’appelant est disponible.',
      x: 80,
      y: 330,
    },
    {
      id: 'A_compose',
      nom: 'Numéro composé',
      ligne: 'A',
      enonce: 'L’utilisateur compose le numéro du correspondant.',
      x: 280,
      y: 330,
    },
    {
      id: 'verification',
      nom: 'Vérification',
      ligne: 'A',
      enonce: 'Le système vérifie la disponibilité (l’état) du correspondant.',
      x: 480,
      y: 330,
    },
    {
      id: 'A_attente',
      nom: 'A attend',
      ligne: 'A',
      enonce: 'L’appel est établi : l’appelant attend que le destinataire réponde.',
      x: 760,
      y: 260,
    },
    {
      id: 'B_libre',
      nom: 'B libre',
      ligne: 'B',
      enonce: 'Le correspondant est disponible.',
      x: 620,
      y: 190,
    },
    {
      id: 'B_sonne',
      nom: 'B sonne',
      ligne: 'B',
      enonce: 'Le téléphone du destinataire sonne.',
      x: 760,
      y: 400,
    },
    {
      id: 'communication',
      nom: 'Communication',
      ligne: 'A+B',
      enonce:
        'Une communication est créée entre les deux utilisateurs ; pendant la communication, ils ne peuvent pas recevoir un autre appel.',
      x: 1000,
      y: 260,
    },
    {
      id: 'pas_de_reponse',
      nom: 'Pas de réponse',
      ligne: 'A',
      enonce: 'Le correspondant ne répond pas après un certain délai : l’appel est interrompu.',
      x: 1000,
      y: 470,
    },
    {
      id: 'ligne_occupee',
      nom: 'Ligne occupée',
      ligne: 'A',
      enonce:
        'Le correspondant est déjà en communication : l’appel est refusé, « ligne occupée » est affiché.',
      x: 220,
      y: 150,
    },
    {
      id: 'B_tiers',
      nom: 'B en communication (tiers)',
      ligne: 'B',
      enonce: 'Le correspondant est déjà en communication (avec un tiers).',
      x: 440,
      y: 50,
    },
  ],
  transitions: [
    {
      id: 't_composer',
      nom: 'Composer',
      enonce: 'Lorsqu’un utilisateur souhaite appeler un autre utilisateur, il compose son numéro.',
      entrees: [arc('A_libre')],
      sorties: [arc('A_compose')],
      x: 180,
      y: 330,
    },
    {
      id: 't_verifier',
      nom: 'Vérifier',
      enonce: 'Le système vérifie alors la disponibilité du correspondant.',
      entrees: [arc('A_compose')],
      sorties: [arc('verification')],
      x: 380,
      y: 330,
    },
    {
      id: 't_etablir',
      nom: 'Établir l’appel',
      enonce:
        'Si le correspondant est disponible, l’appel est établi et le téléphone du destinataire sonne.',
      entrees: [arc('verification'), arc('B_libre')],
      sorties: [arc('A_attente'), arc('B_sonne')],
      x: 620,
      y: 330,
    },
    {
      id: 't_refuser',
      nom: 'Refuser (occupé)',
      enonce: 'Si le correspondant est déjà en communication, l’appel est refusé.',
      // B_tiers est lu (consommé puis rendu) : B reste en communication avec le tiers.
      entrees: [arc('verification'), arc('B_tiers')],
      sorties: [arc('ligne_occupee'), arc('B_tiers')],
      x: 340,
      y: 150,
    },
    {
      id: 't_accepter',
      nom: 'Accepter',
      enonce:
        'Si le destinataire accepte l’appel, une communication est créée entre les deux utilisateurs.',
      entrees: [arc('A_attente'), arc('B_sonne')],
      sorties: [arc('communication')],
      x: 880,
      y: 260,
    },
    {
      id: 't_delai',
      nom: 'Délai expiré',
      enonce: 'Si le correspondant ne répond pas après un certain délai, l’appel est interrompu.',
      entrees: [arc('A_attente'), arc('B_sonne')],
      sorties: [arc('pas_de_reponse'), arc('B_libre')],
      x: 880,
      y: 400,
    },
    {
      id: 't_raccrocher_A',
      nom: 'A raccroche',
      enonce:
        'Lorsque l’un des utilisateurs raccroche, la communication est terminée et les deux lignes redeviennent disponibles.',
      entrees: [arc('communication')],
      sorties: [arc('A_libre'), arc('B_libre')],
      x: 1120,
      y: 200,
    },
    {
      id: 't_raccrocher_B',
      nom: 'B raccroche',
      enonce:
        'Lorsque l’un des utilisateurs raccroche, la communication est terminée et les deux lignes redeviennent disponibles.',
      entrees: [arc('communication')],
      sorties: [arc('A_libre'), arc('B_libre')],
      x: 1120,
      y: 320,
    },
    {
      id: 't_terminer_sans_reponse',
      nom: 'Terminer (pas de réponse)',
      enonce: 'L’appelant peut terminer la tentative et son téléphone redevient disponible.',
      entrees: [arc('pas_de_reponse')],
      sorties: [arc('A_libre')],
      x: 1120,
      y: 470,
    },
    {
      id: 't_terminer_occupee',
      nom: 'Terminer (occupé)',
      enonce: 'L’appelant peut terminer la tentative et son téléphone redevient disponible.',
      entrees: [arc('ligne_occupee')],
      sorties: [arc('A_libre')],
      x: 110,
      y: 190,
    },
    {
      id: 't_tiers_debut',
      nom: 'B appelle un tiers',
      enonce:
        'Le correspondant entre en communication avec quelqu’un d’autre (événement extérieur).',
      entrees: [arc('B_libre')],
      sorties: [arc('B_tiers')],
      x: 620,
      y: 50,
    },
    {
      id: 't_tiers_fin',
      nom: 'Fin appel tiers',
      enonce: 'La communication de B avec le tiers se termine, sa ligne redevient disponible.',
      entrees: [arc('B_tiers')],
      sorties: [arc('B_libre')],
      x: 530,
      y: 120,
    },
  ],
  marquageInitial: {
    A_libre: 1,
    A_compose: 0,
    verification: 0,
    A_attente: 0,
    B_libre: 1,
    B_sonne: 0,
    communication: 0,
    pas_de_reponse: 0,
    ligne_occupee: 0,
    B_tiers: 0,
  },
  invariants: [
    {
      nom: 'Ligne A dans un seul état',
      description:
        'La ligne de A est toujours dans exactement un état : jamais libre et occupée à la fois.',
      poids: {
        A_libre: 1,
        A_compose: 1,
        verification: 1,
        A_attente: 1,
        communication: 1,
        pas_de_reponse: 1,
        ligne_occupee: 1,
      },
    },
    {
      nom: 'Ligne B dans un seul état',
      description:
        'La ligne de B est toujours dans exactement un état : libre, qui sonne, en communication avec A ou avec un tiers.',
      poids: { B_libre: 1, B_sonne: 1, communication: 1, B_tiers: 1 },
    },
  ],
}
