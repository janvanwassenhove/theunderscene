import type { Grid, TileCoord } from './grid'

/**
 * A* over walkable tiles, orthogonal only (diagonals through a rock corner look
 * wrong in isometric and complicate the dig-adjacency rules for nothing).
 *
 * `maxNodes` keeps a single pathfind bounded so a creature asking for an
 * impossible route can't blow the frame budget on a phone.
 */
export function findPath(
  grid: Grid,
  from: TileCoord,
  to: TileCoord,
  opts: { maxNodes?: number; passable?: (x: number, y: number) => boolean } = {},
): TileCoord[] | null {
  const maxNodes = opts.maxNodes ?? 3000
  const passable = opts.passable ?? ((x: number, y: number) => grid.walkable(x, y))

  const sx = Math.round(from.x)
  const sy = Math.round(from.y)
  const tx = Math.round(to.x)
  const ty = Math.round(to.y)
  if (sx === tx && sy === ty) return []
  if (!passable(tx, ty)) return null

  const n = grid.width * grid.height
  const gScore = new Float32Array(n).fill(Infinity)
  const cameFrom = new Int32Array(n).fill(-1)
  const closed = new Uint8Array(n)

  const start = grid.idx(sx, sy)
  const goal = grid.idx(tx, ty)
  gScore[start] = 0

  // Small binary heap keyed on fScore.
  const heapIdx: number[] = []
  const heapF: number[] = []
  const push = (index: number, f: number) => {
    heapIdx.push(index)
    heapF.push(f)
    let i = heapIdx.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heapF[p]! <= heapF[i]!) break
      ;[heapF[p], heapF[i]] = [heapF[i]!, heapF[p]!]
      ;[heapIdx[p], heapIdx[i]] = [heapIdx[i]!, heapIdx[p]!]
      i = p
    }
  }
  const pop = (): number => {
    const top = heapIdx[0]!
    const lastI = heapIdx.pop()!
    const lastF = heapF.pop()!
    if (heapIdx.length > 0) {
      heapIdx[0] = lastI
      heapF[0] = lastF
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < heapF.length && heapF[l]! < heapF[m]!) m = l
        if (r < heapF.length && heapF[r]! < heapF[m]!) m = r
        if (m === i) break
        ;[heapF[m], heapF[i]] = [heapF[i]!, heapF[m]!]
        ;[heapIdx[m], heapIdx[i]] = [heapIdx[i]!, heapIdx[m]!]
        i = m
      }
    }
    return top
  }

  const h = (i: number) => {
    const x = i % grid.width
    const y = (i / grid.width) | 0
    return Math.abs(x - tx) + Math.abs(y - ty)
  }

  push(start, h(start))
  let expanded = 0

  while (heapIdx.length > 0) {
    const current = pop()
    if (current === goal) {
      const path: TileCoord[] = []
      let node = goal
      while (node !== start && node !== -1) {
        path.push({ x: node % grid.width, y: (node / grid.width) | 0 })
        node = cameFrom[node]!
      }
      path.reverse()
      return path
    }
    if (closed[current]) continue
    closed[current] = 1
    if (++expanded > maxNodes) return null

    const cx = current % grid.width
    const cy = (current / grid.width) | 0
    const steps = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ] as const

    for (const [nx, ny] of steps) {
      if (!grid.inBounds(nx, ny)) continue
      if (!passable(nx, ny)) continue
      const ni = grid.idx(nx, ny)
      if (closed[ni]) continue
      const tentative = gScore[current]! + 1
      if (tentative < gScore[ni]!) {
        gScore[ni] = tentative
        cameFrom[ni] = current
        push(ni, tentative + h(ni))
      }
    }
  }

  return null
}

/**
 * Breadth-first search for the closest tile satisfying `accept`, walking only
 * over passable tiles. Returns the path to it, or null.
 */
export function findPathToNearest(
  grid: Grid,
  from: TileCoord,
  accept: (x: number, y: number) => boolean,
  opts: { maxNodes?: number } = {},
): { path: TileCoord[]; target: TileCoord } | null {
  const maxNodes = opts.maxNodes ?? 2500
  const sx = Math.round(from.x)
  const sy = Math.round(from.y)
  if (accept(sx, sy)) return { path: [], target: { x: sx, y: sy } }

  const n = grid.width * grid.height
  const visited = new Uint8Array(n)
  const cameFrom = new Int32Array(n).fill(-1)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  const start = grid.idx(sx, sy)
  queue[tail++] = start
  visited[start] = 1
  let expanded = 0

  while (head < tail) {
    const current = queue[head++]!
    if (++expanded > maxNodes) return null
    const cx = current % grid.width
    const cy = (current / grid.width) | 0

    const steps = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ] as const

    for (const [nx, ny] of steps) {
      if (!grid.inBounds(nx, ny)) continue
      const ni = grid.idx(nx, ny)
      if (visited[ni]) continue
      if (!grid.walkable(nx, ny)) continue
      visited[ni] = 1
      cameFrom[ni] = current
      if (accept(nx, ny)) {
        const path: TileCoord[] = []
        let node = ni
        while (node !== start && node !== -1) {
          path.push({ x: node % grid.width, y: (node / grid.width) | 0 })
          node = cameFrom[node]!
        }
        path.reverse()
        return { path, target: { x: nx, y: ny } }
      }
      queue[tail++] = ni
    }
  }

  return null
}
