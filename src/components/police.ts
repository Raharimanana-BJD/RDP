// Police de l'interface, partagée avec les graphes Cytoscape (dessinés sur un canvas).

export const POLICE = "'Space Grotesk Variable', system-ui, sans-serif"

/**
 * Appelle `rappel` une fois Space Grotesk chargée. Le texte d'un canvas ne déclenche pas
 * le chargement d'une police web : on le demande nous mêmes, puis on redessine.
 */
export function quandPoliceChargee(rappel: () => void) {
  document.fonts
    ?.load("700 13px 'Space Grotesk Variable'")
    .then(rappel)
    .catch(() => {})
}
