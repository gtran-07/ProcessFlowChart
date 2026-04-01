/**
 * utils/colors.ts — Owner color palette assignment for FlowGraph.
 *
 * Each unique owner (team/lane) gets a consistent color from the palette.
 * Colors are assigned in the order owners are first encountered in the node list.
 * The palette cycles if there are more owners than colors.
 *
 * What belongs here: color constants, color assignment logic.
 * What does NOT belong here: any CSS, DOM, or React code.
 */

/**
 * OWNER_PALETTE — the 15-color sequence used to assign colors to owners.
 *
 * Colors are chosen to be visually distinct on a dark background, readable
 * as both node accent bars and text labels. The sequence is ordered so that
 * the first few colors are the most distinct from each other.
 */
export const OWNER_PALETTE: readonly string[] = [
  '#4f9eff', // Blue — accent color, most common first owner
  '#2dd4bf', // Teal
  '#a78bfa', // Purple
  '#f59e0b', // Amber
  '#f87171', // Red
  '#34d399', // Green
  '#fb923c', // Orange
  '#60a5fa', // Light blue
  '#e879f9', // Pink/magenta
  '#facc15', // Yellow
  '#38bdf8', // Sky blue
  '#4ade80', // Light green
  '#f472b6', // Hot pink
  '#818cf8', // Indigo
  '#fb7185', // Rose
] as const;

/**
 * assignOwnerColors — builds a color map for a list of owner names.
 *
 * Returns a Record mapping each owner name to a hex color string.
 * Owners are assigned colors in the order they appear in the provided array.
 * If an owner already has a color in the existing map, that color is preserved
 * (this prevents colors from changing when new owners are added).
 *
 * @param owners        - Array of owner names in the order they should be colored
 * @param existingColors - Any colors already assigned (preserved in the output)
 * @returns             - Complete owner → color map
 */
export function assignOwnerColors(
  owners: string[],
  existingColors: Record<string, string> = {}
): Record<string, string> {
  const result: Record<string, string> = { ...existingColors };
  let paletteIndex = Object.keys(result).length;

  owners.forEach((owner) => {
    if (!result[owner]) {
      // Assign the next available palette color, cycling if we run out
      result[owner] = OWNER_PALETTE[paletteIndex % OWNER_PALETTE.length];
      paletteIndex++;
    }
  });

  return result;
}
