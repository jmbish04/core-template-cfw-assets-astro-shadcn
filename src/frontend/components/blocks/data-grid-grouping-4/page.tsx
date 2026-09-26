import { BomTreeDataGridView } from "./components/data-grid-view"

export function Page() {
  return (
    <main
      className="mx-auto flex min-h-svh w-full items-start justify-center p-8 pt-12"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Bill of materials tree data grid
      </h1>
      <BomTreeDataGridView />
    </main>
  )
}