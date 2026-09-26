import { ROOT_KEY, type ChatNodeRecord } from "./data"

export type PathEntry = {
  node: ChatNodeRecord
  /** Every version of this turn as a record, oldest first, for the rail. */
  versions: ChatNodeRecord[]
  /** Where the visible version sits among them. */
  index: number
  /** Selection key for this fork: the parent id, or ROOT_KEY at the top. */
  forkKey: string
}

/** The fork a node belongs to is keyed by its parent, so a root keys on ROOT_KEY. */
function chooseChild(
  siblings: string[],
  forkKey: string,
  selection: Record<string, string>,
  nodes: Record<string, ChatNodeRecord>
) {
  const chosen = selection[forkKey]
  // Anything unselected falls through to the newest version, which is what a
  // fresh regenerate or edit produces.
  if (chosen && siblings.includes(chosen) && nodes[chosen]) return chosen
  for (let index = siblings.length - 1; index >= 0; index -= 1) {
    if (nodes[siblings[index]]) return siblings[index]
  }
  return null
}

export function buildPath(
  nodes: Record<string, ChatNodeRecord>,
  rootIds: string[],
  selection: Record<string, string>
): PathEntry[] {
  const path: PathEntry[] = []
  let siblings = rootIds
  let forkKey = ROOT_KEY

  while (siblings.length) {
    const id = chooseChild(siblings, forkKey, selection, nodes)
    if (!id) break
    const node = nodes[id]
    const versions = siblings.flatMap((siblingId) =>
      nodes[siblingId] ? [nodes[siblingId]] : []
    )
    path.push({
      node,
      versions,
      index: versions.findIndex((version) => version.id === id),
      forkKey,
    })
    siblings = node.children
    forkKey = node.id
  }

  return path
}

/** The turn a Send continues from, which is the leaf of the visible path. */
export function pathTail(path: PathEntry[]) {
  return path.length ? path[path.length - 1].node : null
}

/** The question a regenerate has to answer again: the last user turn above it. */
export function standingPrompt(path: PathEntry[], beforeId: string) {
  const end = path.findIndex((entry) => entry.node.id === beforeId)
  const searchable = end < 0 ? path : path.slice(0, end)
  for (let index = searchable.length - 1; index >= 0; index -= 1) {
    if (searchable[index].node.role === "user") return searchable[index].node
  }
  return null
}