/**
 * @fileoverview GoogleDocsAgent - A comprehensive agent for Google Docs and Drive operations.
 *
 * This agent provides full CRUD capabilities for Google Docs:
 * - Create documents from scratch or templates
 * - Read document content and metadata
 * - Update documents with text insertions, replacements, and batch edits
 * - Delete documents and manage document lifecycle
 * - Comment management: add, reply, resolve, and AI-powered comment responses
 * - Folder management and organization
 *
 * Built on Cloudflare Agents SDK with RPC methods for type-safe invocation.
 *
 * @example
 * ```typescript
 * // From Worker:
 * const agent = env.GOOGLE_DOCS_AGENT.getByName("user-123");
 * const doc = await agent.createDocument("My Document", "Hello World");
 *
 * // From frontend with AgentClient:
 * const doc = await agent.stub.createDocument("My Document", "Hello World");
 * ```
 */

import { Agent, callable } from "agents";
import { GoogleDocsClient } from "@/backend/ai/tools/google/docs";
import { GoogleDriveClient } from "@/backend/ai/tools/google/drive";
import { getModelRegistry } from "@/backend/ai/models";
import { getProvider } from "@/backend/ai/providers";
import { consultNotebook } from "@/backend/ai/tools/notebooklm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateDocumentOptions {
  /** Initial content as plain text or HTML */
  content?: string;
  /** Content format: 'text' or 'html' */
  contentFormat?: "text" | "html";
  /** Parent folder ID to organize the document */
  parentFolderId?: string;
}

export interface CreateFromTemplateOptions {
  /** Template document ID */
  templateId: string;
  /** Key-value pairs for template replacements */
  replacements: Record<string, string>;
  /** Parent folder ID */
  parentFolderId: string;
  /** Custom document name */
  name?: string;
}

export interface UpdateDocumentOptions {
  /** Text to append to the document */
  appendText?: string;
  /** Replace all occurrences of text */
  replaceAll?: { find: string; replace: string }[];
  /** Insert text at specific index */
  insertAt?: { index: number; text: string }[];
}

export interface CommentOptions {
  /** Anchor text for the comment (optional) */
  anchor?: string;
  /** Comment content */
  content: string;
}

export interface AICommentResponseOptions {
  /** Whether to use NotebookLM for context-aware responses */
  useNotebookContext?: boolean;
  /** Additional context for AI responses */
  additionalContext?: string;
  /** Temperature for AI response generation (0.0-1.0) */
  temperature?: number;
}

export interface DocumentMetadata {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface CommentThread {
  id: string;
  content: string;
  anchor?: string;
  createdTime?: string;
  resolved?: boolean;
  replies?: Array<{
    id: string;
    content: string;
    createdTime?: string;
  }>;
}

// ---------------------------------------------------------------------------
// GoogleDocsAgent
// ---------------------------------------------------------------------------

export class GoogleDocsAgent extends Agent<Env> {
  private docsClient!: GoogleDocsClient;
  private driveClient!: GoogleDriveClient;

  /**
   * Initialize clients when agent starts.
   * Called automatically by the Agents SDK.
   */
  async onStart() {
    this.docsClient = new GoogleDocsClient(this.env);
    this.driveClient = new GoogleDriveClient(this.env);
  }

  // -------------------------------------------------------------------------
  // Create Operations
  // -------------------------------------------------------------------------

  /**
   * Create a new Google Doc with optional initial content.
   *
   * @param name - Document name
   * @param options - Creation options
   * @returns Document metadata including ID and webViewLink
   * @throws Error if document creation fails
   *
   * @example
   * ```typescript
   * const doc = await agent.createDocument("My Document", {
   *   content: "<h1>Hello World</h1><p>This is a test.</p>",
   *   contentFormat: "html",
   *   parentFolderId: "folder-id-here"
   * });
   * console.log(doc.webViewLink);
   * ```
   */
  @callable()
  async createDocument(name: string, options: CreateDocumentOptions = {}): Promise<DocumentMetadata> {
    const { content, contentFormat = "text", parentFolderId } = options;

    if (!content) {
      // Create empty document by copying from a blank template or creating via Drive
      const emptyDoc = await this.driveClient.createDocFromHtml(name, "<p></p>", parentFolderId);
      await this.logToState("createDocument", { name, parentFolderId });
      return emptyDoc;
    }

    if (contentFormat === "html") {
      const doc = await this.driveClient.createDocFromHtml(name, content, parentFolderId);
      await this.logToState("createDocument", { name, contentFormat, parentFolderId });
      return doc;
    }

    // Create empty doc then append text
    const doc = await this.driveClient.createDocFromHtml(name, "<p></p>", parentFolderId);
    await this.docsClient.appendText(doc.id, content);
    await this.logToState("createDocument", { name, contentFormat, parentFolderId });
    return doc;
  }

  /**
   * Create a document from a template with variable replacements.
   *
   * @param options - Template creation options
   * @returns Document metadata
   * @throws Error if template not found or replacements fail
   *
   * @example
   * ```typescript
   * const doc = await agent.createFromTemplate({
   *   templateId: "template-doc-id",
   *   replacements: {
   *     "{{NAME}}": "John Doe",
   *     "{{DATE}}": new Date().toLocaleDateString()
   *   },
   *   parentFolderId: "folder-id",
   *   name: "John Doe Resume"
   * });
   * ```
   */
  @callable()
  async createFromTemplate(options: CreateFromTemplateOptions): Promise<DocumentMetadata> {
    const { templateId, replacements, parentFolderId, name } = options;
    const doc = await this.docsClient.createFromTemplate(
      templateId,
      replacements,
      parentFolderId,
      name,
    );
    await this.logToState("createFromTemplate", { templateId, name, parentFolderId });
    return { id: doc.docId, name: doc.name, webViewLink: doc.webViewLink };
  }

  /**
   * Create a folder in Google Drive.
   *
   * @param name - Folder name
   * @param parentFolderId - Parent folder ID (optional)
   * @returns Folder metadata
   *
   * @example
   * ```typescript
   * const folder = await agent.createFolder("2024 Resumes", "parent-folder-id");
   * ```
   */
  @callable()
  async createFolder(name: string, parentFolderId?: string): Promise<DocumentMetadata> {
    const folder = await this.driveClient.createFolder(name, parentFolderId || "");
    await this.logToState("createFolder", { name, parentFolderId });
    return folder;
  }

  // -------------------------------------------------------------------------
  // Read Operations
  // -------------------------------------------------------------------------

  /**
   * Read the full text content of a document.
   *
   * @param docId - Document ID or URL
   * @returns Plain text content of the document
   * @throws Error if document not found or not accessible
   *
   * @example
   * ```typescript
   * const content = await agent.readDocument("doc-id-here");
   * console.log(content);
   * ```
   */
  @callable()
  async readDocument(docId: string): Promise<string> {
    const content = await this.docsClient.read(docId);
    await this.logToState("readDocument", { docId, length: content.length });
    return content;
  }

  /**
   * List all files in a folder.
   *
   * @param folderId - Folder ID
   * @param sortBy - Sort field (default: "modifiedTime desc")
   * @returns Array of file metadata
   *
   * @example
   * ```typescript
   * const files = await agent.listFilesInFolder("folder-id", "name");
   * ```
   */
  @callable()
  async listFilesInFolder(
    folderId: string,
    sortBy = "modifiedTime desc",
  ): Promise<Array<{ id: string; name: string; modifiedTime?: string }>> {
    const files = await this.driveClient.listFilesInFolderSorted(folderId, sortBy);
    await this.logToState("listFilesInFolder", { folderId, count: files.length });
    return files;
  }

  /**
   * List all comments on a document.
   *
   * @param docId - Document ID
   * @param filter - Optional filter text (e.g., "@colby")
   * @returns Array of comment threads
   *
   * @example
   * ```typescript
   * // Get all unresolved comments
   * const comments = await agent.listComments("doc-id");
   *
   * // Get comments mentioning @colby
   * const taggedComments = await agent.listComments("doc-id", "@colby");
   * ```
   */
  @callable()
  async listComments(docId: string, filter?: string): Promise<CommentThread[]> {
    const comments = await this.docsClient.listComments(docId, filter);
    await this.logToState("listComments", { docId, filter, count: comments.length });
    return comments;
  }

  // -------------------------------------------------------------------------
  // Update Operations
  // -------------------------------------------------------------------------

  /**
   * Update a document with various edit operations.
   *
   * @param docId - Document ID
   * @param options - Update options
   * @throws Error if update operations fail
   *
   * @example
   * ```typescript
   * await agent.updateDocument("doc-id", {
   *   appendText: "\n\nAppended at the end",
   *   replaceAll: [
   *     { find: "old text", replace: "new text" }
   *   ]
   * });
   * ```
   */
  @callable()
  async updateDocument(docId: string, options: UpdateDocumentOptions): Promise<void> {
    const { appendText, replaceAll, insertAt } = options;

    if (appendText) {
      await this.docsClient.appendText(docId, appendText);
    }

    // For replaceAll and insertAt, we'd need to implement batch update
    // This is a simplified version - production code would use the Docs API batchUpdate
    if (replaceAll || insertAt) {
      throw new Error(
        "replaceAll and insertAt not yet implemented. Use appendText for now or extend GoogleDocsClient.",
      );
    }

    await this.logToState("updateDocument", { docId, operations: Object.keys(options) });
  }

  /**
   * Copy an existing document.
   *
   * @param docId - Source document ID
   * @param name - New document name (optional)
   * @param parentFolderId - Destination folder (optional)
   * @returns New document metadata
   *
   * @example
   * ```typescript
   * const copy = await agent.copyDocument("source-doc-id", "Copy of Original");
   * ```
   */
  @callable()
  async copyDocument(
    docId: string,
    name?: string,
    parentFolderId?: string,
  ): Promise<DocumentMetadata> {
    const copied = await this.driveClient.copyFile(docId, name, parentFolderId);
    await this.logToState("copyDocument", { sourceId: docId, name, parentFolderId });
    return copied;
  }

  // -------------------------------------------------------------------------
  // Delete Operations
  // -------------------------------------------------------------------------

  /**
   * Permanently delete a document or folder.
   *
   * ⚠️ This operation cannot be undone!
   *
   * @param fileId - Document or folder ID
   * @throws Error if deletion fails
   *
   * @example
   * ```typescript
   * await agent.deleteDocument("doc-id-to-delete");
   * ```
   */
  @callable()
  async deleteDocument(fileId: string): Promise<void> {
    await this.driveClient.deleteFile(fileId);
    await this.logToState("deleteDocument", { fileId });
  }

  // -------------------------------------------------------------------------
  // Comment Operations
  // -------------------------------------------------------------------------

  /**
   * Add a comment to a document.
   *
   * @param docId - Document ID
   * @param options - Comment options
   * @returns Comment metadata
   *
   * @example
   * ```typescript
   * const comment = await agent.addComment("doc-id", {
   *   content: "This section needs more detail",
   *   anchor: "quoted text from document"
   * });
   * ```
   */
  @callable()
  async addComment(docId: string, options: CommentOptions): Promise<CommentThread> {
    const { anchor = "", content } = options;
    const comment = await this.docsClient.addComment(docId, anchor, content);
    await this.logToState("addComment", { docId, commentId: comment.id });
    return comment;
  }

  /**
   * Reply to an existing comment.
   *
   * @param docId - Document ID
   * @param commentId - Comment ID to reply to
   * @param replyText - Reply content
   * @returns Reply metadata
   *
   * @example
   * ```typescript
   * await agent.replyToComment("doc-id", "comment-id", "Great point! I'll update this.");
   * ```
   */
  @callable()
  async replyToComment(
    docId: string,
    commentId: string,
    replyText: string,
  ): Promise<{ id: string; content: string; createdTime?: string }> {
    const reply = await this.docsClient.replyToComment(docId, commentId, replyText);
    await this.logToState("replyToComment", { docId, commentId, replyId: reply.id });
    return reply;
  }

  /**
   * Generate AI-powered responses to document comments.
   *
   * This method analyzes comments on a document and generates context-aware
   * responses using Workers AI. Optionally consults NotebookLM for additional
   * context from the user's knowledge base.
   *
   * @param docId - Document ID
   * @param filter - Filter for comments (e.g., "@colby" for tagged comments)
   * @param options - AI response options
   * @returns Summary of processed comments
   * @throws Error if AI generation fails
   *
   * @example
   * ```typescript
   * // Respond to all comments mentioning @colby
   * const result = await agent.respondToCommentsWithAI("doc-id", "@colby", {
   *   useNotebookContext: true,
   *   temperature: 0.3
   * });
   * console.log(`Responded to ${result.processedCount} comments`);
   * ```
   */
  @callable()
  async respondToCommentsWithAI(
    docId: string,
    filter?: string,
    options: AICommentResponseOptions = {},
  ): Promise<{
    processedCount: number;
    responses: Array<{ commentId: string; response: string }>;
  }> {
    const { useNotebookContext = false, additionalContext = "", temperature = 0.3 } = options;

    // Get all comments matching the filter
    const comments = await this.docsClient.listComments(docId, filter);
    const unresolvedComments = comments.filter((c) => !c.resolved);

    if (unresolvedComments.length === 0) {
      return { processedCount: 0, responses: [] };
    }

    // Read document for context
    const docText = await this.docsClient.read(docId);

    const provider = getProvider(this.env);
    const model = getModelRegistry(this.env).chat;
    const responses: Array<{ commentId: string; response: string }> = [];

    for (const comment of unresolvedComments) {
      try {
        let contextInfo = `Document content:\n${docText.slice(0, 2000)}...\n\n`;

        // Optionally consult NotebookLM for additional context
        if (useNotebookContext) {
          const notebookQuery = `The user commented: "${comment.content}". Provide relevant context from their knowledge base.`;
          const notebookResult = await consultNotebook(this.env, notebookQuery);
          contextInfo += `\nKnowledge base context:\n${notebookResult.answer}\n\n`;
        }

        if (additionalContext) {
          contextInfo += `\nAdditional context:\n${additionalContext}\n\n`;
        }

        // Generate AI response
        const result = await provider.invokeModel(model, {
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant responding to document comments. Be concise, specific, and actionable. Keep responses under 200 words.",
            },
            {
              role: "user",
              content: `${contextInfo}\nUser comment: "${comment.content}"\n\nProvide a helpful response:`,
            },
          ],
          temperature,
          max_tokens: 400,
        });

        const responseText = result.response;

        // Post the response
        await this.docsClient.replyToComment(docId, comment.id, responseText);

        responses.push({
          commentId: comment.id,
          response: responseText,
        });
      } catch (error) {
        console.error(`Failed to respond to comment ${comment.id}:`, error);
      }
    }

    await this.logToState("respondToCommentsWithAI", {
      docId,
      filter,
      processedCount: responses.length,
    });

    return {
      processedCount: responses.length,
      responses,
    };
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  /**
   * Log operations to agent state for audit trail.
   */
  private async logToState(operation: string, details: Record<string, unknown>): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.sql`
      INSERT OR IGNORE INTO operation_log (timestamp, operation, details)
      VALUES (${timestamp}, ${operation}, ${JSON.stringify(details)})
    `;
  }

  /**
   * Initialize the operation log table on first use.
   */
  async initializeStorage() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS operation_log (
        timestamp TEXT,
        operation TEXT,
        details TEXT
      )
    `;
  }
}
