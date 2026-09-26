/**
 * @fileoverview Barrel for the shared chat layer.
 *
 * Everything the twelve `/chat/*` surfaces have in common lives here: the
 * thread rail, the composer, the transcript (with its reasoning fold and turn
 * receipt), the routing-profile picker, the canvas document, the drive
 * attachment picker, the selection-to-quote pill and the error banner.
 *
 * Surfaces 1–4 are built on it; surfaces 5–12 import from it. These exports
 * are a contract — add to them, do not rename them.
 */

export { AttachmentChips, AttachmentPicker, describeAttachments, type AttachmentPickerProps, type DriveFile } from "./attachment-picker";
export { CanvasDocument, useChatDocument, type CanvasDocumentProps, type UseChatDocument } from "./canvas-document";
export { ChatComposer, type ChatComposerProps } from "./composer";
export { ChatErrorBanner, type ChatErrorBannerProps } from "./errors";
export { ReplyReceipt, RoutedBadge, RoutingPicker, type ReplyReceiptProps, type RoutingPickerProps } from "./routing-picker";
export { QuotedLine, SelectionQuotePill, quotedPrompt, type SelectionQuotePillProps } from "./selection-quote";
export { ThreadList, useThreads, type ThreadListProps, type UseThreads } from "./thread-list";
export { THREAD_PARAM, useThreadSession, writeThreadParam, type ThreadSession } from "./thread-url";
export { useBelow } from "./use-viewport";
export {
  ReasoningFold,
  Transcript,
  TurnReceipt,
  type ReasoningFoldProps,
  type TranscriptProps,
  type TurnReceiptProps,
} from "./transcript";
