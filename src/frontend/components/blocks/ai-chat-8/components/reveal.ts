import { useEffect, useState } from "react"

/** One reveal tick. Every tick grows the transcript, which costs a resize
    observation and an autoscroll, so a slower clock carries more text. */
const TICK_MS = 50
/** Reading pace, and the floor and cap on how long a reply may take. */
const CHARS_PER_TICK = 27
const MIN_TICKS = 20
const MAX_TICKS = 72

/** One character rate for the whole reply, so a long answer takes longer than
    a short one without ever dragging: about 1s at the floor, 3.6s at the cap. */
function revealRate(text: string) {
  const ticks = Math.min(
    MAX_TICKS,
    Math.max(MIN_TICKS, Math.round(text.length / CHARS_PER_TICK))
  )
  return Math.max(2, Math.ceil(text.length / ticks))
}

/** How long the reveal will take, so a settle timer can wait it out instead
    of guessing at a fixed number. */
export function revealDurationMs(text: string) {
  return Math.ceil(text.length / revealRate(text)) * TICK_MS
}

/** True when the reader has asked for no motion, so the reply lands whole. */
export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** The reply types itself out, instantly under reduced motion. */
export function useRevealedText(text: string, active: boolean) {
  const rate = revealRate(text)
  const [revealed, setRevealed] = useState(active ? rate : text.length)

  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      setRevealed(text.length)
      return
    }
    // Starts on the first chunk, so a reply never opens with an empty line.
    setRevealed(rate)
    const timer = window.setInterval(() => {
      setRevealed((current) => Math.min(text.length, current + rate))
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [active, rate, text.length])

  return revealed >= text.length ? text : text.slice(0, revealed)
}