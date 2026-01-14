/**
 * Help Center Component
 * Knowledge base, AI chat, and support
 */
import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  useHelpCategories,
  useHelpArticles,
  useSearchHelp,
  useAIHelpChat,
  useRateArticle,
} from "@/api/hooks/useOnboarding";
import type { HelpArticle, ChatMessage } from "@/api/types/onboarding";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/api/client";
import { toastError } from "@/components/ui/Toast";

type HelpTab = "browse" | "search" | "chat";

export function HelpCenter() {
  const [activeTab, setActiveTab] = useState<HelpTab>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary">Help Center</h1>
        <p className="text-text-secondary mt-2">
          Find answers, tutorials, and get support
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length >= 2) {
                setActiveTab("search");
              }
            }}
            className="pl-10 pr-4 py-3 text-lg"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            🔍
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2">
        <Button
          variant={activeTab === "browse" ? "primary" : "ghost"}
          onClick={() => setActiveTab("browse")}
        >
          📚 Browse
        </Button>
        <Button
          variant={activeTab === "search" ? "primary" : "ghost"}
          onClick={() => setActiveTab("search")}
        >
          🔍 Search
        </Button>
        <Button
          variant={activeTab === "chat" ? "primary" : "ghost"}
          onClick={() => setActiveTab("chat")}
        >
          💬 AI Assistant
        </Button>
      </div>

      {/* Content */}
      {activeTab === "browse" && (
        <BrowseTab
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedArticle={selectedArticle}
          onSelectArticle={setSelectedArticle}
        />
      )}
      {activeTab === "search" && (
        <SearchTab query={searchQuery} onSelectArticle={setSelectedArticle} />
      )}
      {activeTab === "chat" && <ChatTab />}
    </div>
  );
}

function BrowseTab({
  selectedCategory,
  onSelectCategory,
  selectedArticle,
  onSelectArticle,
}: {
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  selectedArticle: string | null;
  onSelectArticle: (id: string | null) => void;
}) {
  const { data: categories, isLoading: categoriesLoading } =
    useHelpCategories();
  const { data: articles, isLoading: articlesLoading } = useHelpArticles(
    selectedCategory || undefined,
  );

  if (selectedArticle) {
    return (
      <ArticleView
        articleId={selectedArticle}
        onBack={() => onSelectArticle(null)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Categories Sidebar */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {categoriesLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 bg-background-secondary animate-pulse rounded"
                  />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                <button
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-background-secondary transition-colors",
                    !selectedCategory && "bg-primary/10 text-primary",
                  )}
                  onClick={() => onSelectCategory(null)}
                >
                  All Articles
                </button>
                {categories?.map((cat) => (
                  <button
                    key={cat.id}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-background-secondary transition-colors flex items-center gap-2",
                      selectedCategory === cat.id &&
                        "bg-primary/10 text-primary",
                    )}
                    onClick={() => onSelectCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span className="flex-1">{cat.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {cat.article_count}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Articles List */}
      <div className="md:col-span-3">
        {articlesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-background-secondary animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : !articles?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-text-secondary mt-4">No articles found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => onSelectArticle(article.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleCard({
  article,
  onClick,
}: {
  article: HelpArticle;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <h3 className="font-semibold text-lg">{article.title}</h3>
        <p className="text-text-secondary mt-1 line-clamp-2">
          {article.excerpt}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm text-text-muted">
          <span>{article.category}</span>
          <span>•</span>
          <span>{article.views.toLocaleString()} views</span>
          {article.tags.length > 0 && (
            <>
              <span>•</span>
              <div className="flex gap-1">
                {article.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ArticleView({
  articleId,
  onBack,
}: {
  articleId: string;
  onBack: () => void;
}) {
  const rateArticle = useRateArticle();

  const handleRate = async (helpful: boolean) => {
    try {
      await rateArticle.mutateAsync({ article_id: articleId, helpful });
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  // Mock article content for demo
  const article = {
    title: "Getting Started with Work Orders",
    content_html: `
      <h2>Creating Your First Work Order</h2>
      <p>Work orders are the core of your service business. Here's how to create one:</p>
      <ol>
        <li>Navigate to Work Orders from the sidebar</li>
        <li>Click "New Work Order" button</li>
        <li>Select or create a customer</li>
        <li>Add service items and notes</li>
        <li>Assign a technician and schedule</li>
        <li>Save the work order</li>
      </ol>
      <h3>Tips</h3>
      <ul>
        <li>Use templates for common service types</li>
        <li>Add photos from the mobile app</li>
        <li>Track parts and materials used</li>
      </ul>
    `,
    helpful_count: 45,
    not_helpful_count: 3,
    related_articles: ["scheduling-tips", "mobile-app-guide"],
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Back to Articles
        </Button>

        <h1 className="text-2xl font-bold">{article.title}</h1>

        <div
          className="prose prose-sm mt-6 max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content_html }}
        />

        {/* Helpfulness Rating */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-text-secondary text-center">
            Was this article helpful?
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Button
              variant="secondary"
              onClick={() => handleRate(true)}
              disabled={rateArticle.isPending}
            >
              👍 Yes ({article.helpful_count})
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRate(false)}
              disabled={rateArticle.isPending}
            >
              👎 No ({article.not_helpful_count})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchTab({
  query,
  onSelectArticle,
}: {
  query: string;
  onSelectArticle: (id: string) => void;
}) {
  const { data: results, isLoading } = useSearchHelp(query);

  if (query.length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <span className="text-4xl">🔍</span>
          <p className="text-text-secondary mt-4">
            Enter at least 2 characters to search
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-background-secondary animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (!results?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <span className="text-4xl">🤷</span>
          <p className="text-lg font-medium mt-4">No results found</p>
          <p className="text-text-secondary mt-2">
            Try different keywords or browse categories
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-text-secondary">
        Found {results.length} result{results.length !== 1 ? "s" : ""} for "
        {query}"
      </p>
      {results.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onClick={() => onSelectArticle(article.id)}
        />
      ))}
    </div>
  );
}

function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your AI assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chat = useAIHelpChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || chat.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const result = await chat.mutateAsync({
        message: userMessage.content,
        conversation_id: conversationId,
      });
      setConversationId(result.conversation_id);
      setMessages((prev) => [...prev, result.message]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: "error",
          role: "assistant",
          content: "Sorry, I couldn't process your request. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>💬</span> AI Help Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Messages */}
        <div className="h-96 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] p-3 rounded-lg",
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-background-secondary",
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-text-muted">Sources:</p>
                    <div className="space-y-1 mt-1">
                      {msg.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          className="text-xs text-primary hover:underline block"
                        >
                          {source.type === "article" && "📄"}{" "}
                          {source.type === "video" && "🎥"} {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {chat.isPending && (
            <div className="flex justify-start">
              <div className="bg-background-secondary p-3 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={chat.isPending}
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!input.trim() || chat.isPending}
          >
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
