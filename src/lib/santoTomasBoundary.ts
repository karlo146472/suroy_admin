/**
 * The municipal border of Santo Tomas, Davao del Norte, as a closed ring of [longitude, latitude] points.
 *
 * Source: OpenStreetMap (relation 15882603, "Santo Tomas", an administrative boundary), simplified to about 30 meters.
 * © OpenStreetMap contributors, available under the Open Database License (https://www.openstreetmap.org/copyright).
 * It covers about 229 km², which matches the official land area of the municipality.
 */
export const SANTO_TOMAS_BOUNDARY: [number, number][] = [
  [125.54999, 7.45089],
  [125.57832, 7.45090],
  [125.58296, 7.44957],
  [125.58899, 7.44990],
  [125.58900, 7.45090],
  [125.62022, 7.45090],
  [125.62090, 7.46140],
  [125.62052, 7.46342],
  [125.62076, 7.46713],
  [125.64108, 7.46669],
  [125.65658, 7.46158],
  [125.66986, 7.46441],
  [125.67752, 7.47097],
  [125.69325, 7.47047],
  [125.69892, 7.47073],
  [125.69945, 7.47038],
  [125.70031, 7.46748],
  [125.70062, 7.46433],
  [125.74898, 7.46456],
  [125.74947, 7.46679],
  [125.75336, 7.47003],
  [125.75255, 7.47164],
  [125.75353, 7.47679],
  [125.75269, 7.47817],
  [125.74442, 7.47869],
  [125.74243, 7.47962],
  [125.73991, 7.48318],
  [125.73901, 7.48937],
  [125.73620, 7.49178],
  [125.73507, 7.49465],
  [125.73375, 7.49540],
  [125.73327, 7.49653],
  [125.73337, 7.49795],
  [125.73441, 7.49990],
  [125.73428, 7.50087],
  [125.73313, 7.50181],
  [125.72992, 7.50162],
  [125.72870, 7.50291],
  [125.72833, 7.50689],
  [125.72644, 7.50842],
  [125.72539, 7.51044],
  [125.72768, 7.51293],
  [125.72767, 7.51497],
  [125.72696, 7.51611],
  [125.72393, 7.51844],
  [125.72365, 7.51921],
  [125.72452, 7.52091],
  [125.72700, 7.52189],
  [125.72759, 7.52291],
  [125.72673, 7.52999],
  [125.72580, 7.53126],
  [125.72493, 7.53151],
  [125.72322, 7.53141],
  [125.72041, 7.53014],
  [125.71922, 7.53022],
  [125.71887, 7.53091],
  [125.71848, 7.53552],
  [125.71900, 7.53662],
  [125.72102, 7.53828],
  [125.72115, 7.53955],
  [125.72027, 7.54008],
  [125.71537, 7.53684],
  [125.71343, 7.53686],
  [125.71245, 7.53764],
  [125.71237, 7.53881],
  [125.71324, 7.54059],
  [125.71522, 7.54208],
  [125.71628, 7.54365],
  [125.71591, 7.54574],
  [125.71500, 7.54631],
  [125.71309, 7.54638],
  [125.71132, 7.54569],
  [125.70957, 7.54425],
  [125.70769, 7.54420],
  [125.70584, 7.54504],
  [125.70444, 7.54753],
  [125.70445, 7.54894],
  [125.70553, 7.55065],
  [125.71062, 7.55480],
  [125.71612, 7.55614],
  [125.71552, 7.55761],
  [125.71289, 7.55790],
  [125.71183, 7.55890],
  [125.71150, 7.56075],
  [125.71233, 7.56252],
  [125.67907, 7.56295],
  [125.66437, 7.55165],
  [125.63089, 7.56230],
  [125.57930, 7.57590],
  [125.54999, 7.57779],
  [125.54999, 7.45089],
]

/** True when the point lies inside the border of Santo Tomas (ray-casting test against the border above). */
export function isInsideSantoTomas(latitude: number, longitude: number): boolean {
  let inside = false
  for (let i = 0, j = SANTO_TOMAS_BOUNDARY.length - 1; i < SANTO_TOMAS_BOUNDARY.length; j = i++) {
    const [lngI, latI] = SANTO_TOMAS_BOUNDARY[i]
    const [lngJ, latJ] = SANTO_TOMAS_BOUNDARY[j]
    const crosses = latI > latitude !== latJ > latitude
    if (crosses && longitude < ((lngJ - lngI) * (latitude - latI)) / (latJ - latI) + lngI) inside = !inside
  }
  return inside
}

/** Shown when a destination's location is outside Santo Tomas. */
export const OUTSIDE_SANTO_TOMAS_MESSAGE =
  'This location is outside Santo Tomas, Davao del Norte. Destinations can only be added inside the municipality, which is the area inside the dashed line on the map. Move the pin inside the border.'
