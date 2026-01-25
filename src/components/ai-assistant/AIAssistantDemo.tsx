/**
 * AI Assistant Demo Component
 *
 * Simple demonstration interface for testing the Unified AI Assistant
 */

import React, { useState, useRef, useEffect } from "react";
import { useAIAssistant, useAIHealth } from "@/api/hooks/ai-assistant";
import type { AIMessage, AIAction } from "@/api/types/aiAssistant";

interface AIAssistantDemoProps {
  conversationId?: string;
  className?: string;
}

export function AIAssistantDemo({
  conversationId,
  className,
}: AIAssistantDemoProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sendMessage,
    executeAction,
    messages,
    isLoading,
    error,
    context,
    clearConversation,
  } = useAIAssistant(conversationId);

  const { isHealthy, unhealthyDomains } = useAIHealth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");

    try {
      await sendMessage(userMessage);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleExecuteAction = async (action: AIAction) => {
    try {
      await executeAction(action);
    } catch (error) {
      console.error("Failed to execute action:", error);
    }
  };

  const renderMessage = (msg: AIMessage) => {
    const isUser = msg.role === "user";
    const isSystem = msg.role === "system";

    return (
      <div
        key={msg.id}
        className={`mb-4 ${isUser ? "ml-8" : "mr-8"} ${isSystem ? "mx-4" : ""}`}
      >
        <div
          className={`rounded-lg p-3 ${
            isUser
              ? "bg-blue-500 text-white ml-auto max-w-xs"
              : isSystem
                ? "bg-yellow-100 text-yellow-800 text-center text-sm"
                : "bg-gray-100 text-gray-900 max-w-md"
          }`}
        >
          <div className="text-sm font-medium mb-1">
            {isUser ? "You" : isSystem ? "System" : "AI Assistant"}
            {msg.confidence && (
              <span className="ml-2 text-xs opacity-75">
                ({Math.round(msg.confidence * 100)}% confident)
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap">{msg.content}</div>
          <div className="text-xs opacity-75 mt-1">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Render suggested actions */}
        {msg.actions && msg.actions.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="text-xs font-medium text-gray-600">
              Suggested Actions:
            </div>
            {msg.actions.map((action) => (
              <div
                key={action.id}
                className="bg-blue-50 border border-blue-200 rounded p-2 text-sm"
              >
                <div className="font-medium">{action.operation}</div>
                <div className="text-gray-600 text-xs mb-2">
                  Domain: {action.domain} | Confidence:{" "}
                  {Math.round(action.confidence * 100)}%
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExecuteAction(action)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                  >
                    Execute
                  </button>
                  <button
                    onClick={() => console.log("Action details:", action)}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Render suggestions */}
        {msg.metadata?.suggestions && msg.metadata.suggestions.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs font-medium text-gray-600">
              Quick suggestions:
            </div>
            <div className="flex flex-wrap gap-2">
              {msg.metadata.suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() =>
                    setMessage(suggestion.query || suggestion.title)
                  }
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  {suggestion.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <div className="text-sm text-gray-500">
            Status: {isHealthy ? "🟢 Healthy" : "🔴 Issues Detected"}
            {unhealthyDomains.length > 0 && (
              <span className="ml-2">
                ({unhealthyDomains.join(", ")} unavailable)
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearConversation}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Context Info */}
      {context && (
        <div className="p-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
          <div>Page: {context.app.currentPage}</div>
          {context.app.currentEntity && (
            <div>
              Entity: {context.app.currentEntity.type} #
              {context.app.currentEntity.id}
            </div>
          )}
          <div>Role: {context.user.role}</div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-lg mb-2">👋 Hello! I'm your AI Assistant</div>
            <div className="text-sm">
              Ask me anything about customers, work orders, schedules, or any
              other CRM operations.
            </div>
            <div className="mt-4 text-xs space-y-1">
              <div>Try asking:</div>
              <div>• "Show me John Smith's activity summary"</div>
              <div>• "What tickets need urgent attention?"</div>
              <div>• "Who's available for HVAC work today?"</div>
            </div>
          </div>
        ) : (
          messages.map(renderMessage)
        )}

        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-500 mr-8">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <div className="text-sm">AI is thinking...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mx-4">
            <div className="text-red-800 text-sm font-medium">Error</div>
            <div className="text-red-600 text-sm">{error.message}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-200"
      >
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send • Try natural language queries
        </div>
      </form>
    </div>
  );
}

// ===== FLOATING AI ORB COMPONENT =====

export function AIAssistantOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const { isHealthy } = useAIHealth();

  return (
    <>
      {/* Floating orb */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg transition-all duration-200 z-50 ${
          isHealthy
            ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-110"
            : "bg-gray-400"
        }`}
        title="Open AI Assistant"
      >
        <span className="text-white text-xl">🤖</span>
        {!isHealthy && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-2xl h-96 bg-white rounded-lg shadow-xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full z-10"
            >
              ×
            </button>
            <AIAssistantDemo className="h-full" />
          </div>
        </div>
      )}
    </>
  );
}

// ===== HOTKEY INTEGRATION =====

export function AIAssistantHotkey() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen(true);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div
        className="absolute inset-0 bg-black bg-opacity-30"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl backdrop-blur-sm">
        <AIAssistantDemo className="h-96" />
      </div>
    </div>
  );
}
