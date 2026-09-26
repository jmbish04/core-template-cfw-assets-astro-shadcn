import { KanbanBoard } from "./components/kanban-board"

export function Page() {
  return (
    <main
      className="bg-muted/35 flex min-h-svh w-full items-start justify-center p-4"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Issue tracking kanban board
      </h1>
      <KanbanBoard />
    </main>
  )
}