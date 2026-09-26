"use client"

import { useRef, useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"

import { Composer } from "./composer"
import {
  CONNECTED_AT_START,
  MODELS,
  MODES,
  type AppId,
  type AttachmentRecord,
  type ModeId,
} from "./data"
import { ModeChips } from "./mode-chips"
import { RunPanel } from "./run-panel"
import { Welcome } from "./welcome"

type RunRecord = {
  id: number
  prompt: string
  mode: ModeId
}

export function AiChat() {
  /** The apps the assistant may read. Everything downstream reads this. */
  const [connected, setConnected] = useState<AppId[]>(CONNECTED_AT_START)
  const [modeId, setModeId] = useState<ModeId>("digest")
  const [modelId, setModelId] = useState(MODELS[0].id)
  const [draft, setDraft] = useState("")
  const [staged, setStaged] = useState<AttachmentRecord[]>([])
  const [run, setRun] = useState<RunRecord | null>(null)

  const nextRunId = useRef(0)
  const composer = useRef<HTMLTextAreaElement>(null)

  const mode = MODES.find((item) => item.id === modeId) ?? MODES[0]
  // A run reports against the mode it was started with, so switching modes
  // afterwards cannot rewrite the receipts already on screen.
  const runMode = run
    ? (MODES.find((item) => item.id === run.mode) ?? mode)
    : mode

  function handleToggleApp(id: AppId, next: boolean) {
    setConnected((current) =>
      next
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((appId) => appId !== id)
    )
  }

  function handleSend(text: string, files: AttachmentRecord[]) {
    nextRunId.current += 1
    setRun({
      id: nextRunId.current,
      // An empty box still sends when files are staged, so the run needs a
      // prompt of its own to show at the top.
      prompt:
        text ||
        `${mode.label} ${files.length === 1 ? files[0].name : `${files.length} attached files`}`,
      mode: modeId,
    })
    setDraft("")
    setStaged([])
  }

  function handleReset() {
    setRun(null)
    composer.current?.focus()
  }

  return (
    // Every tooltip in the block needs this ancestor to open.
    <TooltipProvider>
      <div className="bg-background text-foreground flex min-h-svh w-full flex-col justify-center px-4 py-10 sm:px-6">
        <main className="mx-auto flex w-full max-w-2xl flex-col">
          {run ? (
            <RunPanel
              key={run.id}
              prompt={run.prompt}
              mode={runMode}
              connected={connected}
              onConnect={(id) => handleToggleApp(id, true)}
              onReset={handleReset}
            />
          ) : (
            <Welcome />
          )}

          <Composer
            value={draft}
            files={staged}
            mode={mode}
            modelId={modelId}
            connected={connected}
            fieldRef={composer}
            onValueChange={setDraft}
            onFilesChange={setStaged}
            onModelChange={setModelId}
            onToggleApp={handleToggleApp}
            onSend={handleSend}
          />

          {/* The chips only steer the next question, so a settled run hides
              them rather than offering a switch that changes nothing. */}
          {run ? null : (
            <div className="mt-4">
              <ModeChips mode={modeId} onModeChange={setModeId} />
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  )
}