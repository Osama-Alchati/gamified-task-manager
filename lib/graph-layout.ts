export type SnakeOptions = { centerX?: number; startY?: number; amplitude?: number; stepY?: number; frequency?: number };

/** Winding-road layout from the spec: posX = sin(i * 0.8) * 160 + centerX, posY = i * 120 + startY. */
export function snakeLayout(index: number, o: SnakeOptions = {}) {
  const { centerX = 0, startY = 0, amplitude = 160, stepY = 120, frequency = 0.8 } = o;
  return { x: Math.round(Math.sin(index * frequency) * amplitude + centerX), y: index * stepY + startY };
}
