/**
 * Content Generator Modal
 *
 * AI-powered content generation modal for the Marketing Tasks dashboard.
 * Allows users to generate blog posts, FAQs, GBP posts, and service descriptions.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useGenerateContent } from "@/api/hooks/useMarketingTasks";

interface ContentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ContentType = "blog" | "faq" | "gbp_post" | "service_description";

const CONTENT_TYPES: { value: ContentType; label: string; icon: string; description: string }[] = [
  { value: "blog", label: "Blog Post", icon: "📝", description: "Full article for your website blog" },
  { value: "faq", label: "FAQ", icon: "❓", description: "Frequently asked question and answer" },
  { value: "gbp_post", label: "GBP Post", icon: "📍", description: "Short post for Google Business Profile" },
  { value: "service_description", label: "Service Page", icon: "🛠️", description: "Description for a service page" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "authoritative", label: "Authoritative" },
];

export function ContentGeneratorModal({ isOpen, onClose }: ContentGeneratorModalProps) {
  const [contentType, setContentType] = useState<ContentType>("blog");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const generateMutation = useGenerateContent();
  const { addToast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      addToast({
        title: "Topic Required",
        description: "Please enter a topic for the content.",
        variant: "error",
      });
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        contentType,
        topic: topic.trim(),
        tone,
      });

      setGeneratedContent(result.content);
      setIsDemoMode(result.demoMode);

      addToast({
        title: "Content Generated!",
        description: result.demoMode
          ? "Demo content created (AI service runs locally)"
          : "AI content generated successfully",
        variant: "success",
      });
    } catch (error) {
      addToast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "error",
      });
    }
  };

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      addToast({
        title: "Copied!",
        description: "Content copied to clipboard",
        variant: "success",
      });
    }
  };

  const handleReset = () => {
    setGeneratedContent(null);
    setIsDemoMode(false);
  };

  const selectedType = CONTENT_TYPES.find(t => t.value === contentType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">🤖</span>
            AI Content Generator
          </DialogTitle>
          <p className="text-sm text-text-secondary mt-1">
            Generate professional marketing content for your business
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Content Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-secondary">
              Content Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setContentType(type.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    contentType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-surface-secondary"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <p className="text-xs text-text-secondary">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Topic Input */}
          <div className="space-y-2">
            <label htmlFor="topic" className="text-sm font-medium text-text-secondary">
              Topic / Keywords
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`e.g., "septic tank maintenance tips" or "grease trap cleaning"`}
              className="w-full px-4 py-3 rounded-lg border border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <p className="text-xs text-text-secondary">
              Enter the main topic or keywords for your content
            </p>
          </div>

          {/* Tone Selection */}
          <div className="space-y-2">
            <label htmlFor="tone" className="text-sm font-medium text-text-secondary">
              Tone
            </label>
            <Select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full"
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Generate Button */}
          {!generatedContent && (
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !topic.trim()}
              className="w-full py-3 text-lg"
              variant="primary"
            >
              {generateMutation.isPending ? (
                <>
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Generate {selectedType?.label}
                </>
              )}
            </Button>
          )}

          {/* Generated Content Preview */}
          {generatedContent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">Generated Content</span>
                  {isDemoMode && (
                    <Badge variant="secondary">Demo Mode</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={handleReset}>
                    🔄 New
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleCopy}>
                    📋 Copy
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface-secondary border border-border max-h-[400px] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary">
                  {generatedContent}
                </pre>
              </div>

              {isDemoMode && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700 flex items-start gap-2">
                  <span>💡</span>
                  <div>
                    <div className="font-medium">Demo Mode Active</div>
                    <div className="text-xs mt-1">
                      The AI content service runs locally. Connect via tunnel for live AI generation.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="flex-1"
                  variant="secondary"
                >
                  {generateMutation.isPending ? "Regenerating..." : "🔄 Regenerate"}
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1"
                  variant="primary"
                >
                  ✓ Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
