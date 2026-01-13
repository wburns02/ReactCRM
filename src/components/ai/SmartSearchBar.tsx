import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartSearch, useSearchSuggestions, type SearchResultItem } from "@/api/hooks/useSearchAI";

/**
 * AI-powered smart search bar with natural language processing
 * Supports queries like "find customer John Smith" or "show overdue invoices"
 */
export function SmartSearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const searchMutation = useSmartSearch();
  const suggestionsMutation = useSearchSuggestions();

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowResults(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions as user types
  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(() => {
        suggestionsMutation.mutate(query);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [query]);

  const handleSearch = () => {
    if (query.trim()) {
      searchMutation.mutate(query);
      setShowResults(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleResultClick = (result: SearchResultItem) => {
    navigate(result.url);
    setIsOpen(false);
    setShowResults(false);
    setQuery("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    searchMutation.mutate(suggestion);
    setShowResults(true);
  };

  const getTypeIcon = (type: SearchResultItem["type"]) => {
    switch (type) {
      case "customer":
        return "👤";
      case "work_order":
        return "📋";
      case "invoice":
        return "💵";
      case "technician":
        return "🔧";
      case "prospect":
        return "🎯";
      case "ticket":
        return "🎫";
      default:
        return "📄";
    }
  };

  const getTypeLabel = (type: SearchResultItem["type"]) => {
    switch (type) {
      case "customer":
        return "Customer";
      case "work_order":
        return "Work Order";
      case "invoice":
        return "Invoice";
      case "technician":
        return "Technician";
      case "prospect":
        return "Prospect";
      case "ticket":
        return "Ticket";
      default:
        return "Result";
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-text-muted hover:bg-bg-hover transition-colors"
      >
        <span>✨</span>
        <span className="text-sm">AI Search</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-bg-secondary rounded border border-border">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-24">
      <div
        ref={containerRef}
        className="w-full max-w-2xl bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <span className="text-lg">✨</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search with natural language... (e.g., 'find overdue invoices')"
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none"
            autoFocus
          />
          {searchMutation.isPending && (
            <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          )}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowResults(false);
              setQuery("");
            }}
            className="text-text-muted hover:text-text-primary"
          >
            <kbd className="px-1.5 py-0.5 text-xs bg-bg-secondary rounded border border-border">
              ESC
            </kbd>
          </button>
        </div>

        {/* Query Interpretation */}
        {searchMutation.data?.query_interpretation && showResults && (
          <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/30">
            <p className="text-sm text-purple-400">
              {searchMutation.data.query_interpretation}
              {searchMutation.data.filters_applied.length > 0 && (
                <span className="ml-2 text-xs">
                  ({searchMutation.data.filters_applied.map((f) => `${f.field}: ${f.value}`).join(", ")})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Results */}
        {showResults && searchMutation.data?.results && (
          <div className="max-h-96 overflow-y-auto">
            {searchMutation.data.results.length > 0 ? (
              <div className="p-2">
                {searchMutation.data.results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-bg-hover transition-colors text-left"
                  >
                    <span className="text-xl">{getTypeIcon(result.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary truncate">
                          {result.title}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-text-muted">
                          {getTypeLabel(result.type)}
                        </span>
                        <span className="text-xs text-purple-400">
                          {result.relevance_score}% match
                        </span>
                      </div>
                      <p className="text-sm text-text-muted truncate">{result.subtitle}</p>
                      {result.highlights.length > 0 && (
                        <p className="text-xs text-purple-400 mt-1">
                          {result.highlights[0]}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-muted">
                No results found for "{query}"
              </div>
            )}

            {/* Search Stats */}
            <div className="px-4 py-2 bg-bg-secondary border-t border-border text-xs text-text-muted">
              Found {searchMutation.data.total_count} results in {searchMutation.data.search_time_ms}ms
            </div>
          </div>
        )}

        {/* Suggestions */}
        {!showResults && query.length >= 2 && suggestionsMutation.data && (
          <div className="p-2">
            <p className="px-2 py-1 text-xs text-text-muted">Suggestions</p>
            {suggestionsMutation.data.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-hover transition-colors text-sm text-text-secondary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Help Text */}
        {!showResults && query.length < 2 && (
          <div className="p-4 space-y-2">
            <p className="text-sm text-text-muted">Try searching for:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Find customer John",
                "Show overdue invoices",
                "Today's work orders",
                "Available technicians",
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(example)}
                  className="px-3 py-2 text-left text-sm bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
