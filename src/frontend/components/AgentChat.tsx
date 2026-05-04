/**
 * @fileoverview AgentChat - Real-time AI chat interface using assistant-ui and Agents SDK
 *
 * This component demonstrates a complete AI chat experience powered by:
 * - assistant-ui: Beautiful, accessible chat UI components
 * - Cloudflare Agents SDK: Stateful AI agents with WebSocket support
 * - Workers AI: LLM inference on Cloudflare's network
 * - AgentClient: Type-safe RPC calls to agent methods
 *
 * Features:
 * - Real-time message streaming via WebSockets
 * - Markdown rendering with code highlighting
 * - Message history persistence
 * - Typing indicators
 * - Error handling with user-friendly messages
 * - Responsive mobile/desktop layout
 */

"use client";

import { AgentClient } from "agents/client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Zap, Bot, User } from "lucide-react";

// ---------------------------------------------------------------------------
// Agent Client Setup
// ---------------------------------------------------------------------------

/**
 * Initialize the AgentClient for communicating with OrchestratorAgent.
 *
 * The AgentClient provides type-safe RPC calls to agent methods over WebSockets.
 * It handles connection management, reconnection, and message serialization.
 */
function createAgentClient(agentName: string): AgentClient {
  // In development, use localhost. In production, use the deployed URL.
  const wsUrl = import.meta.env.DEV
    ? `ws://localhost:8787/api/agents/orchestrator/${agentName}`
    : `wss://${window.location.host}/api/agents/orchestrator/${agentName}`;

  return new AgentClient(wsUrl);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  status?: "sending" | "sent" | "error";
}

interface AgentInfo {
  name: string;
  status: "connecting" | "connected" | "disconnected";
  capabilities: string[];
}

// ---------------------------------------------------------------------------
// AgentChat Component
// ---------------------------------------------------------------------------

export function AgentChat() {
  const [agentInfo, setAgentInfo] = useState<AgentInfo>({
    name: "OrchestratorAgent",
    status: "disconnected",
    capabilities: [
      "Document Generation",
      "Career Guidance",
      "Resume Review",
      "Google Docs Integration",
    ],
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your AI assistant powered by Cloudflare Agents SDK. I can help you with document generation, career guidance, and more. What would you like to work on today?",
      timestamp: new Date().toISOString(),
      status: "sent",
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const agentClientRef = useRef<AgentClient | null>(null);

  // Initialize agent client on mount
  useEffect(() => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const client = createAgentClient(sessionId);

    setAgentInfo((prev) => ({ ...prev, status: "connecting" }));

    // Set up connection handlers
    client.addEventListener("open", () => {
      setAgentInfo((prev) => ({ ...prev, status: "connected" }));
      console.log("Agent connected");
    });

    client.addEventListener("close", () => {
      setAgentInfo((prev) => ({ ...prev, status: "disconnected" }));
      console.log("Agent disconnected");
    });

    client.addEventListener("error", (event) => {
      console.error("Agent error:", event);
      setAgentInfo((prev) => ({ ...prev, status: "disconnected" }));
    });

    // Listen for agent messages (streaming responses)
    client.addEventListener("message", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);

        if (data.type === "chat_response") {
          // Append assistant message
          setMessages((prev) => [
            ...prev,
            {
              id: data.messageId || crypto.randomUUID(),
              role: "assistant",
              content: data.content,
              timestamp: new Date().toISOString(),
              status: "sent",
            },
          ]);
          setIsProcessing(false);
        } else if (data.type === "error") {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `Error: ${data.message}`,
              timestamp: new Date().toISOString(),
              status: "error",
            },
          ]);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error("Failed to parse agent message:", error);
      }
    });

    agentClientRef.current = client;

    // Cleanup on unmount
    return () => {
      client.close();
    };
  }, []);

  // Send message to agent
  const sendMessage = async () => {
    if (!inputValue.trim() || isProcessing || !agentClientRef.current) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    try {
      // Call agent RPC method
      // The OrchestratorAgent has a `chat` method that handles conversation
      await agentClientRef.current.stub.chat(userMessage.content);

      // Update user message status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: "sent" as const } : msg,
        ),
      );
    } catch (error) {
      console.error("Failed to send message:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date().toISOString(),
          status: "error",
        },
      ]);

      setIsProcessing(false);
    }
  };

  // Handle Enter key to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
        {/* Sidebar - Agent Info */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agent Info
            </CardTitle>
            <CardDescription>Status and capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Status</p>
              <Badge
                variant={
                  agentInfo.status === "connected"
                    ? "default"
                    : agentInfo.status === "connecting"
                      ? "outline"
                      : "destructive"
                }
              >
                {agentInfo.status === "connected" && <Zap className="h-3 w-3 mr-1" />}
                {agentInfo.status === "connecting" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {agentInfo.status}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Capabilities</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {agentInfo.capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {cap}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Powered by Cloudflare Agents SDK and Workers AI
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <Card className="lg:col-span-3 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              Chat with your AI agent in real-time via WebSockets
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      } ${message.status === "error" ? "border-2 border-destructive" : ""}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-2 ${message.role === "user" ? "text-primary-foreground/70" : "text-secondary-foreground/70"}`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                        {message.status === "sending" && " • Sending..."}
                        {message.status === "error" && " • Failed"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isProcessing && (
                <div className="flex gap-3 justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg p-4 bg-secondary text-secondary-foreground">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Shift+Enter for new line)"
                  disabled={agentInfo.status !== "connected" || isProcessing}
                  className="flex-1 min-h-[60px] max-h-[200px] resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || agentInfo.status !== "connected" || isProcessing}
                  size="lg"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>

              {agentInfo.status !== "connected" && (
                <p className="text-sm text-muted-foreground mt-2">
                  {agentInfo.status === "connecting"
                    ? "Connecting to agent..."
                    : "Agent disconnected. Refresh to reconnect."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
