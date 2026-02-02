/**
 * Content Generator Modal - World-Class AI Content Generation
 *
 * Features:
 * - AI Model Selector (Auto, GPT-4o, Claude, Local)
 * - Idea Generator with AI brainstorming
 * - Multi-variant A/B generation
 * - Real-time SEO & readability analysis
 * - Content library integration
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  useGenerateContent,
  useGenerateIdeas,
  useGenerateVariants,
  useAIModelHealth,
  type ContentType,
  type ToneType,
  type AudienceType,
  type AIModelType,
} from "@/api/hooks/useMarketingTasks";

interface ContentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONTENT_TYPES: { value: ContentType; label: string; icon: string; description: string }[] = [
  { value: "blog", label: "Blog Post", icon: "📝", description: "Full article for your website blog" },
  { value: "faq", label: "FAQ", icon: "❓", description: "Frequently asked question and answer" },
  { value: "gbp_post", label: "GBP Post", icon: "📍", description: "Short post for Google Business Profile" },
  { value: "service_description", label: "Service Page", icon: "🛠️", description: "Description for a service page" },
];

const TONES: { value: ToneType; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "authoritative", label: "Authoritative" },
  { value: "educational", label: "Educational" },
];

const AUDIENCES: { value: AudienceType; label: string }[] = [
  { value: "homeowners", label: "Homeowners" },
  { value: "businesses", label: "Commercial Businesses" },
  { value: "property_managers", label: "Property Managers" },
  { value: "contractors", label: "Contractors" },
  { value: "general", label: "General Audience" },
];

type ViewMode = "setup" | "ideas" | "generating" | "result" | "variants";

export function ContentGeneratorModal({ isOpen, onClose }: ContentGeneratorModalProps) {
  // Form state
  const [contentType, setContentType] = useState<ContentType>("blog");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<ToneType>("professional");
  const [audience, setAudience] = useState<AudienceType>("homeowners");
  const [keywords, setKeywords] = useState("");
  const [selectedModel, setSelectedModel] = useState<AIModelType>("auto");
  const [wordCount, setWordCount] = useState(500);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("setup");
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    content: string;
    seoScore: number | null;
    readabilityScore: number | null;
    modelUsed: string;
    generationTime: number;
  } | null>(null);
  const [variants, setVariants] = useState<Array<{
    label: string;
    title: string;
    content: string;
    hookStyle: string;
    seoScore: number | null;
    readabilityScore: number | null;
  }>>([]);
  const [ideas, setIdeas] = useState<Array<{
    id: string;
    topic: string;
    description: string;
    hook: string;
    difficulty: string;
    keywords: string[];
  }>>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Mutations & queries
  const { data: modelHealth } = useAIModelHealth();
  const generateMutation = useGenerateContent();
  const generateIdeasMutation = useGenerateIdeas();
  const generateVariantsMutation = useGenerateVariants();
  const { addToast } = useToast();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setViewMode("setup");
      setGeneratedContent(null);
      setVariants([]);
      setIdeas([]);
      setSelectedVariantIndex(0);
    }
  }, [isOpen]);

  // Adjust word count based on content type
  useEffect(() => {
    if (contentType === "gbp_post") setWordCount(150);
    else if (contentType === "faq") setWordCount(250);
    else if (contentType === "blog") setWordCount(800);
    else setWordCount(500);
  }, [contentType]);

  const handleGenerateIdeas = async () => {
    const keywordList = keywords.split(",").map(k => k.trim()).filter(Boolean);
    if (keywordList.length === 0) {
      addToast({
        title: "Keywords Required",
        description: "Enter at least one keyword to generate ideas.",
        variant: "error",
      });
      return;
    }

    try {
      const result = await generateIdeasMutation.mutateAsync({
        keywords: keywordList,
        content_type: contentType,
        audience,
        count: 5,
        model: selectedModel,
      });

      setIdeas(result.ideas.map(idea => ({
        id: idea.id,
        topic: idea.topic,
        description: idea.description,
        hook: idea.hook,
        difficulty: idea.difficulty,
        keywords: idea.keywords,
      })));
      setIsDemoMode(result.demo_mode);
      setViewMode("ideas");
    } catch {
      addToast({
        title: "Idea Generation Failed",
        description: "Please try again.",
        variant: "error",
      });
    }
  };

  const handleSelectIdea = (idea: typeof ideas[0]) => {
    setTopic(idea.topic);
    setKeywords(idea.keywords.join(", "));
    setViewMode("setup");
    addToast({
      title: "Idea Selected",
      description: "Topic and keywords updated. Ready to generate!",
      variant: "success",
    });
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      addToast({
        title: "Topic Required",
        description: "Please enter a topic for the content.",
        variant: "error",
      });
      return;
    }

    setViewMode("generating");

    try {
      const keywordList = keywords.split(",").map(k => k.trim()).filter(Boolean);

      const result = await generateMutation.mutateAsync({
        content_type: contentType,
        topic: topic.trim(),
        tone,
        audience,
        target_keywords: keywordList,
        word_count: wordCount,
        model: selectedModel,
        include_cta: true,
        include_meta: contentType === "blog",
      });

      setGeneratedContent({
        title: result.content.title,
        content: result.content.content,
        seoScore: result.content.seo_score,
        readabilityScore: result.content.readability_score,
        modelUsed: result.content.model_used,
        generationTime: result.content.generation_time_ms,
      });
      setIsDemoMode(result.demo_mode);
      setViewMode("result");

      addToast({
        title: "Content Generated!",
        description: result.demo_mode
          ? "Demo content created (AI service unavailable)"
          : `Generated in ${(result.content.generation_time_ms / 1000).toFixed(1)}s`,
        variant: "success",
      });
    } catch {
      setViewMode("setup");
      addToast({
        title: "Generation Failed",
        description: "Please try again.",
        variant: "error",
      });
    }
  };

  const handleGenerateVariants = async () => {
    if (!topic.trim()) {
      addToast({
        title: "Topic Required",
        description: "Please enter a topic first.",
        variant: "error",
      });
      return;
    }

    setViewMode("generating");

    try {
      const keywordList = keywords.split(",").map(k => k.trim()).filter(Boolean);

      const result = await generateVariantsMutation.mutateAsync({
        content_type: contentType,
        topic: topic.trim(),
        tone,
        audience,
        target_keywords: keywordList,
        word_count: wordCount,
        model: selectedModel,
        variant_count: 3,
        variation_style: "mixed",
      });

      setVariants(result.variants.map(v => ({
        label: v.variant_label,
        title: v.title,
        content: v.content,
        hookStyle: v.hook_style,
        seoScore: v.seo_score,
        readabilityScore: v.readability_score,
      })));
      setIsDemoMode(result.demo_mode);
      setSelectedVariantIndex(0);
      setViewMode("variants");

      addToast({
        title: "Variants Generated!",
        description: `${result.variants.length} variants created for A/B comparison`,
        variant: "success",
      });
    } catch {
      setViewMode("setup");
      addToast({
        title: "Variant Generation Failed",
        description: "Please try again.",
        variant: "error",
      });
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    addToast({
      title: "Copied!",
      description: "Content copied to clipboard",
      variant: "success",
    });
  };

  const handleReset = () => {
    setViewMode("setup");
    setGeneratedContent(null);
    setVariants([]);
    setIdeas([]);
    setTopic("");
    setKeywords("");
  };

  const selectedType = CONTENT_TYPES.find(t => t.value === contentType);
  const isProcessing = generateMutation.isPending || generateIdeasMutation.isPending || generateVariantsMutation.isPending;

  // Get model display info
  const getModelInfo = () => {
    if (!modelHealth) return { label: "Loading...", available: false };
    const model = modelHealth.models.find(m => m.id === selectedModel);
    if (!model) return { label: "Auto", available: true };
    return {
      label: model.display_name,
      available: model.available,
      speed: model.speed,
      quality: model.quality,
      cost: model.cost,
    };
  };

  const modelInfo = getModelInfo();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">🤖</span>
            AI Content Generator
            {isDemoMode && <Badge variant="secondary" className="ml-2">Demo Mode</Badge>}
          </DialogTitle>
          <p className="text-sm text-text-secondary mt-1">
            World-class AI-powered content generation for your marketing
          </p>
        </DialogHeader>

        {/* Setup View */}
        {viewMode === "setup" && (
          <div className="space-y-6 mt-4">
            {/* AI Model Selector */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-purple-900">AI Model</label>
                {modelHealth && (
                  <span className="text-xs text-purple-600">
                    {modelHealth.local_available ? "🟢 Local GPU" : modelHealth.cloud_available ? "☁️ Cloud" : "⚠️ Limited"}
                  </span>
                )}
              </div>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as AIModelType)}
                className="w-full bg-white"
              >
                <option value="auto">🎯 Auto (Recommended)</option>
                <option value="openai/gpt-4o">⚡ OpenAI GPT-4o</option>
                <option value="openai/gpt-4o-mini">💨 OpenAI GPT-4o Mini</option>
                <option value="anthropic/claude-3.5-sonnet">🎭 Claude 3.5 Sonnet</option>
                <option value="local/qwen2.5:7b">🖥️ Local Fast (Qwen 7B)</option>
                <option value="local/llama3.1:70b">🦙 Local Heavy (Llama 70B)</option>
              </Select>
              <div className="flex gap-4 mt-2 text-xs text-purple-700">
                <span>Speed: {modelInfo.speed || "varies"}</span>
                <span>Quality: {modelInfo.quality || "excellent"}</span>
                <span>Cost: {modelInfo.cost || "optimized"}</span>
              </div>
            </div>

            {/* Content Type Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-text-secondary">Content Type</label>
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

            {/* Keywords Input with Idea Generator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="keywords" className="text-sm font-medium text-text-secondary">
                  Keywords
                </label>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleGenerateIdeas}
                  disabled={isProcessing || !keywords.trim()}
                  className="text-xs"
                >
                  {generateIdeasMutation.isPending ? "💭 Thinking..." : "💡 Generate Ideas"}
                </Button>
              </div>
              <input
                id="keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., septic pumping, maintenance, East Texas"
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <p className="text-xs text-text-secondary">
                Comma-separated keywords to include in your content
              </p>
            </div>

            {/* Topic Input */}
            <div className="space-y-2">
              <label htmlFor="topic" className="text-sm font-medium text-text-secondary">
                Topic / Title
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`e.g., "5 Signs Your Septic Tank Needs Pumping"`}
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            {/* Tone & Audience Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="tone" className="text-sm font-medium text-text-secondary">Tone</label>
                <Select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as ToneType)}
                  className="w-full"
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="audience" className="text-sm font-medium text-text-secondary">Audience</label>
                <Select
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as AudienceType)}
                  className="w-full"
                >
                  {AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Word Count Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-text-secondary">Target Length</label>
                <span className="text-sm text-primary font-medium">{wordCount} words</span>
              </div>
              <input
                type="range"
                min={contentType === "gbp_post" ? 50 : 100}
                max={contentType === "gbp_post" ? 300 : contentType === "faq" ? 500 : 2000}
                step={50}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {/* Generate Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isProcessing || !topic.trim()}
                className="flex-1 py-3"
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
              <Button
                onClick={handleGenerateVariants}
                disabled={isProcessing || !topic.trim()}
                variant="secondary"
                className="py-3"
              >
                {generateVariantsMutation.isPending ? "..." : "🔀 A/B Variants"}
              </Button>
            </div>
          </div>
        )}

        {/* Ideas View */}
        {viewMode === "ideas" && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <span className="text-xl">💡</span>
                AI-Generated Ideas
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setViewMode("setup")}>
                ← Back
              </Button>
            </div>

            <div className="space-y-3">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-surface-secondary transition-all cursor-pointer"
                  onClick={() => handleSelectIdea(idea)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-text-primary">{idea.topic}</h4>
                      <p className="text-sm text-text-secondary mt-1">{idea.description}</p>
                      {idea.hook && (
                        <p className="text-xs text-primary mt-2 italic">"{idea.hook}"</p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {idea.keywords.slice(0, 3).map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                        <Badge variant={idea.difficulty === "easy" ? "success" : idea.difficulty === "hard" ? "danger" : "secondary"} className="text-xs">
                          {idea.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="primary" className="ml-4 shrink-0">
                      Use This
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generating View */}
        {viewMode === "generating" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Generating Content...</h3>
            <p className="text-sm text-text-secondary">Our AI is crafting your {selectedType?.label.toLowerCase()}</p>
            <div className="flex gap-2 mt-4">
              <Badge variant="secondary">Model: {modelInfo.label}</Badge>
              <Badge variant="secondary">~{wordCount} words</Badge>
            </div>
          </div>
        )}

        {/* Result View */}
        {viewMode === "result" && generatedContent && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Generated Content</h3>
                {isDemoMode && <Badge variant="secondary">Demo</Badge>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={handleReset}>
                  🔄 New
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleCopy(generatedContent.content)}>
                  📋 Copy
                </Button>
              </div>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-surface-secondary text-center">
                <div className="text-2xl font-bold text-primary">
                  {generatedContent.seoScore ?? "--"}
                </div>
                <div className="text-xs text-text-secondary">SEO Score</div>
              </div>
              <div className="p-3 rounded-lg bg-surface-secondary text-center">
                <div className="text-2xl font-bold text-primary">
                  {generatedContent.readabilityScore?.toFixed(0) ?? "--"}
                </div>
                <div className="text-xs text-text-secondary">Readability</div>
              </div>
              <div className="p-3 rounded-lg bg-surface-secondary text-center">
                <div className="text-2xl font-bold text-primary">
                  {(generatedContent.generationTime / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-text-secondary">Gen Time</div>
              </div>
            </div>

            {/* Content Preview */}
            <div className="p-4 rounded-lg bg-surface-secondary border border-border max-h-[400px] overflow-y-auto">
              <h4 className="font-medium text-lg mb-3">{generatedContent.title}</h4>
              <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary">
                {generatedContent.content}
              </pre>
            </div>

            <div className="text-xs text-text-secondary text-center">
              Generated with {generatedContent.modelUsed}
            </div>

            <Button onClick={onClose} className="w-full" variant="primary">
              ✓ Done
            </Button>
          </div>
        )}

        {/* Variants View */}
        {viewMode === "variants" && variants.length > 0 && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <span className="text-xl">🔀</span>
                A/B Variants
              </h3>
              <Button size="sm" variant="secondary" onClick={handleReset}>
                🔄 New
              </Button>
            </div>

            {/* Variant Tabs */}
            <div className="flex gap-2 border-b border-border pb-2">
              {variants.map((variant, index) => (
                <button
                  key={variant.label}
                  onClick={() => setSelectedVariantIndex(index)}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                    selectedVariantIndex === index
                      ? "bg-primary text-white"
                      : "bg-surface-secondary text-text-secondary hover:bg-surface hover:text-text-primary"
                  }`}
                >
                  Variant {variant.label}
                  {variant.seoScore && (
                    <span className="ml-2 text-xs opacity-75">
                      ({variant.seoScore} SEO)
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Selected Variant */}
            {variants[selectedVariantIndex] && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{variants[selectedVariantIndex].hookStyle}</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopy(variants[selectedVariantIndex].content)}
                  >
                    📋 Copy This Variant
                  </Button>
                </div>

                {/* Variant Scores */}
                <div className="flex gap-4">
                  <div className="text-sm">
                    <span className="text-text-secondary">SEO: </span>
                    <span className="font-medium text-primary">
                      {variants[selectedVariantIndex].seoScore ?? "--"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-text-secondary">Readability: </span>
                    <span className="font-medium text-primary">
                      {variants[selectedVariantIndex].readabilityScore?.toFixed(0) ?? "--"}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-surface-secondary border border-border max-h-[350px] overflow-y-auto">
                  <h4 className="font-medium text-lg mb-3">
                    {variants[selectedVariantIndex].title}
                  </h4>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary">
                    {variants[selectedVariantIndex].content}
                  </pre>
                </div>
              </div>
            )}

            <Button onClick={onClose} className="w-full" variant="primary">
              ✓ Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
