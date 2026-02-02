/**
 * Content Generator Modal - World-Class AI Content Generation
 *
 * Features:
 * - AI Model Selector (Auto, GPT-4o, Claude, Local)
 * - Idea Generator with AI brainstorming
 * - Multi-variant A/B generation
 * - Real-time SEO & readability analysis
 * - Premium UI with animations and micro-interactions
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
    if (!modelHealth) return { label: "Loading...", available: false, speed: "varies", quality: "excellent", cost: "optimized" };
    const model = modelHealth.models.find(m => m.id === selectedModel);
    if (!model) return { label: "Auto", available: true, speed: "varies", quality: "excellent", cost: "optimized" };
    return {
      label: model.display_name,
      available: model.available,
      speed: model.speed,
      quality: model.quality,
      cost: model.cost,
    };
  };

  const modelInfo = getModelInfo();

  // Get score color classes
  const getScoreColor = (score: number | null, type: "seo" | "readability") => {
    if (score === null) return { bg: "from-gray-50 to-gray-100", border: "border-gray-200", text: "text-gray-600" };
    if (type === "seo") {
      if (score >= 70) return { bg: "from-green-50 to-emerald-50", border: "border-green-200", text: "text-green-600" };
      if (score >= 50) return { bg: "from-yellow-50 to-amber-50", border: "border-yellow-200", text: "text-yellow-600" };
      return { bg: "from-red-50 to-rose-50", border: "border-red-200", text: "text-red-600" };
    }
    // Readability (Flesch scale 0-100, higher is easier)
    if (score >= 60) return { bg: "from-green-50 to-emerald-50", border: "border-green-200", text: "text-green-600" };
    if (score >= 40) return { bg: "from-yellow-50 to-amber-50", border: "border-yellow-200", text: "text-yellow-600" };
    return { bg: "from-red-50 to-rose-50", border: "border-red-200", text: "text-red-600" };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg shadow-lg shadow-purple-500/25">
              ✨
            </div>
            <div>
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">
                AI Content Generator
              </span>
              {isDemoMode && <Badge variant="secondary" className="ml-2 text-xs">Demo Mode</Badge>}
            </div>
          </DialogTitle>
          <p className="text-sm text-text-secondary mt-1 ml-[52px]">
            World-class AI-powered content generation for your marketing
          </p>
        </DialogHeader>

        {/* Setup View */}
        {viewMode === "setup" && (
          <div className="space-y-8 mt-6">
            {/* AI Model Selector - Premium Card */}
            <div className="relative overflow-hidden rounded-2xl border border-purple-200/50 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-5 shadow-sm">
              {/* Animated shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-purple-900">AI Model</label>
                  {modelHealth && (
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${modelHealth.local_available ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : modelHealth.cloud_available ? "bg-blue-500" : "bg-yellow-500"}`} />
                      <span className={`text-xs font-medium ${modelHealth.local_available ? "text-green-700" : modelHealth.cloud_available ? "text-blue-700" : "text-yellow-700"}`}>
                        {modelHealth.local_available ? "Local GPU" : modelHealth.cloud_available ? "Cloud Ready" : "Limited"}
                      </span>
                    </div>
                  )}
                </div>

                <Select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as AIModelType)}
                  className="w-full bg-white/80 backdrop-blur-sm border-purple-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="auto">🎯 Auto (Recommended)</option>
                  <option value="openai/gpt-4o">⚡ OpenAI GPT-4o</option>
                  <option value="openai/gpt-4o-mini">💨 OpenAI GPT-4o Mini</option>
                  <option value="anthropic/claude-3.5-sonnet">🎭 Claude 3.5 Sonnet</option>
                  <option value="local/qwen2.5:7b">🖥️ Local Fast (Qwen 7B)</option>
                  <option value="local/llama3.1:70b">🦙 Local Heavy (Llama 70B)</option>
                </Select>

                {/* Model stats as pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    modelInfo.speed === "fast" ? "bg-green-100 text-green-700" :
                    modelInfo.speed === "medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-purple-100 text-purple-700"
                  }`}>
                    ⚡ {modelInfo.speed}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    modelInfo.quality === "excellent" ? "bg-blue-100 text-blue-700" :
                    modelInfo.quality === "great" ? "bg-indigo-100 text-indigo-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    ✨ {modelInfo.quality}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    modelInfo.cost === "free" ? "bg-green-100 text-green-700" :
                    modelInfo.cost === "low" ? "bg-emerald-100 text-emerald-700" :
                    "bg-orange-100 text-orange-700"
                  }`}>
                    💰 {modelInfo.cost}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Type Selection - Interactive Cards */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-text-primary">Content Type</label>
              <div className="grid grid-cols-2 gap-4">
                {CONTENT_TYPES.map((type) => {
                  const isSelected = contentType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setContentType(type.value)}
                      className={`group relative p-5 rounded-2xl text-left transition-all duration-200 ${
                        isSelected
                          ? "bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10 ring-2 ring-primary/30"
                          : "bg-white border-2 border-border/50 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1"
                      }`}
                    >
                      {/* Icon with background */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 transition-colors ${
                        isSelected ? "bg-primary/20" : "bg-gray-100 group-hover:bg-primary/10"
                      }`}>
                        {type.icon}
                      </div>
                      <span className="font-semibold text-text-primary block">{type.label}</span>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">{type.description}</p>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shadow-md">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Keywords Input with Idea Generator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="keywords" className="text-sm font-semibold text-text-primary">
                  Keywords
                </label>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleGenerateIdeas}
                  disabled={isProcessing || !keywords.trim()}
                  className="rounded-full px-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100 transition-all"
                >
                  {generateIdeasMutation.isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2" />
                      Thinking...
                    </>
                  ) : (
                    <>💡 Generate Ideas</>
                  )}
                </Button>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg">
                  🏷️
                </div>
                <input
                  id="keywords"
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g., septic pumping, maintenance, East Texas"
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-border/60 bg-white
                             shadow-inner shadow-gray-100/50
                             focus:border-primary focus:ring-4 focus:ring-primary/10
                             placeholder:text-text-muted/60 transition-all duration-200"
                />
              </div>
              <p className="text-xs text-text-muted pl-1">
                Comma-separated keywords to include in your content
              </p>
            </div>

            {/* Topic Input */}
            <div className="space-y-3">
              <label htmlFor="topic" className="text-sm font-semibold text-text-primary">
                Topic / Title
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg">
                  ✏️
                </div>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={`e.g., "5 Signs Your Septic Tank Needs Pumping"`}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-border/60 bg-white
                             shadow-inner shadow-gray-100/50
                             focus:border-primary focus:ring-4 focus:ring-primary/10
                             placeholder:text-text-muted/60 transition-all duration-200"
                />
              </div>
            </div>

            {/* Tone & Audience Row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label htmlFor="tone" className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <span>🎨</span> Tone
                </label>
                <Select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as ToneType)}
                  className="w-full rounded-xl border-2 border-border/60 py-3 focus:ring-4 focus:ring-primary/10"
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-3">
                <label htmlFor="audience" className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <span>👥</span> Audience
                </label>
                <Select
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as AudienceType)}
                  className="w-full rounded-xl border-2 border-border/60 py-3 focus:ring-4 focus:ring-primary/10"
                >
                  {AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Word Count Slider - Custom Styled */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <span>📏</span> Target Length
                </label>
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/20 text-primary text-sm font-bold">
                  {wordCount} words
                </span>
              </div>
              <div className="relative py-2">
                <input
                  type="range"
                  min={contentType === "gbp_post" ? 50 : 100}
                  max={contentType === "gbp_post" ? 300 : contentType === "faq" ? 500 : 2000}
                  step={50}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full h-2.5 rounded-full appearance-none cursor-pointer
                             bg-gradient-to-r from-gray-200 via-primary/30 to-primary
                             [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                             [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:bg-white
                             [&::-webkit-slider-thumb]:border-3 [&::-webkit-slider-thumb]:border-primary
                             [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30
                             [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200
                             [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:hover:shadow-xl"
                />
                <div className="flex justify-between text-xs text-text-muted mt-2 px-1">
                  <span>Short</span>
                  <span>Medium</span>
                  <span>Long</span>
                </div>
              </div>
            </div>

            {/* Generate Buttons - Hero CTAs */}
            <div className="flex gap-4 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={isProcessing || !topic.trim()}
                className="flex-1 py-4 text-base font-semibold rounded-xl
                           bg-gradient-to-r from-primary via-primary to-primary-hover
                           hover:from-primary-hover hover:via-primary hover:to-primary
                           shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30
                           transition-all duration-300 hover:-translate-y-0.5
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                           group"
                variant="primary"
              >
                {generateMutation.isPending ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="mr-2 inline-block transition-transform group-hover:rotate-12 group-hover:scale-110">
                      🚀
                    </span>
                    Generate {selectedType?.label}
                  </>
                )}
              </Button>
              <Button
                onClick={handleGenerateVariants}
                disabled={isProcessing || !topic.trim()}
                variant="secondary"
                className="py-4 px-6 rounded-xl border-2 border-dashed border-primary/40
                           hover:border-primary hover:bg-primary/5
                           transition-all duration-200"
              >
                {generateVariantsMutation.isPending ? (
                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>🔀 A/B Variants</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Ideas View */}
        {viewMode === "ideas" && (
          <div className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">💡</span>
                AI-Generated Ideas
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setViewMode("setup")} className="rounded-full">
                ← Back
              </Button>
            </div>

            <div className="space-y-4">
              {ideas.map((idea, index) => (
                <div
                  key={idea.id}
                  className="group p-5 rounded-2xl border-2 border-border/50 bg-white hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                  onClick={() => handleSelectIdea(idea)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary group-hover:text-primary transition-colors">{idea.topic}</h4>
                      <p className="text-sm text-text-secondary mt-2">{idea.description}</p>
                      {idea.hook && (
                        <p className="text-xs text-primary mt-3 italic bg-primary/5 px-3 py-2 rounded-lg">
                          "{idea.hook}"
                        </p>
                      )}
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {idea.keywords.slice(0, 3).map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs rounded-full">{kw}</Badge>
                        ))}
                        <Badge
                          variant={idea.difficulty === "easy" ? "success" : idea.difficulty === "hard" ? "danger" : "secondary"}
                          className="text-xs rounded-full"
                        >
                          {idea.difficulty === "easy" ? "🟢" : idea.difficulty === "hard" ? "🔴" : "🟡"} {idea.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="primary" className="shrink-0 rounded-full px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      Use This →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generating View - Delightful Animation */}
        {viewMode === "generating" && (
          <div className="flex flex-col items-center justify-center py-20">
            {/* Animated orb */}
            <div className="relative w-28 h-28 mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-[spin_3s_linear_infinite] opacity-20 blur-xl" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse opacity-40" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 animate-pulse" />
              <div className="absolute inset-6 rounded-full bg-white flex items-center justify-center text-3xl shadow-inner">
                ✨
              </div>
            </div>

            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Creating your content...
            </h3>
            <p className="text-text-secondary animate-pulse">
              Our AI is crafting your {selectedType?.label.toLowerCase()}
            </p>
            <div className="flex gap-2 mt-6">
              <Badge variant="secondary" className="rounded-full">Model: {modelInfo.label}</Badge>
              <Badge variant="secondary" className="rounded-full">~{wordCount} words</Badge>
            </div>
          </div>
        )}

        {/* Result View */}
        {viewMode === "result" && generatedContent && (
          <div className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-lg shadow-lg shadow-green-500/25">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Generated Content</h3>
                  {isDemoMode && <Badge variant="secondary" className="text-xs">Demo</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={handleReset} className="rounded-full">
                  🔄 New
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleCopy(generatedContent.content)} className="rounded-full">
                  📋 Copy
                </Button>
              </div>
            </div>

            {/* Score Cards - Color-coded with progress */}
            <div className="grid grid-cols-3 gap-4">
              {/* SEO Score */}
              {(() => {
                const colors = getScoreColor(generatedContent.seoScore, "seo");
                return (
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${colors.bg} border ${colors.border}`}>
                    <div className={`text-3xl font-bold ${colors.text}`}>
                      {generatedContent.seoScore ?? "--"}
                    </div>
                    <div className={`text-xs font-medium mt-1 ${colors.text} opacity-80`}>SEO Score</div>
                    {generatedContent.seoScore !== null && (
                      <div className="mt-3 h-1.5 rounded-full bg-black/10">
                        <div
                          className={`h-full rounded-full ${generatedContent.seoScore >= 70 ? "bg-green-500" : generatedContent.seoScore >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{width: `${generatedContent.seoScore}%`}}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Readability */}
              {(() => {
                const colors = getScoreColor(generatedContent.readabilityScore, "readability");
                return (
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${colors.bg} border ${colors.border}`}>
                    <div className={`text-3xl font-bold ${colors.text}`}>
                      {generatedContent.readabilityScore?.toFixed(0) ?? "--"}
                    </div>
                    <div className={`text-xs font-medium mt-1 ${colors.text} opacity-80`}>Readability</div>
                    {generatedContent.readabilityScore !== null && (
                      <div className="mt-3 h-1.5 rounded-full bg-black/10">
                        <div
                          className={`h-full rounded-full ${generatedContent.readabilityScore >= 60 ? "bg-green-500" : generatedContent.readabilityScore >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{width: `${generatedContent.readabilityScore}%`}}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Gen Time */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200">
                <div className="text-3xl font-bold text-purple-600">
                  {(generatedContent.generationTime / 1000).toFixed(1)}s
                </div>
                <div className="text-xs font-medium text-purple-600 opacity-80 mt-1">Gen Time</div>
              </div>
            </div>

            {/* Content Preview */}
            <div className="p-6 rounded-2xl bg-white border-2 border-border/50 shadow-inner max-h-[400px] overflow-y-auto">
              <h4 className="font-semibold text-lg mb-4 pb-3 border-b border-border">{generatedContent.title}</h4>
              <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary leading-relaxed">
                {generatedContent.content}
              </pre>
            </div>

            <div className="text-xs text-text-muted text-center">
              Generated with {generatedContent.modelUsed}
            </div>

            <Button onClick={onClose} className="w-full py-4 rounded-xl text-base font-semibold" variant="primary">
              ✓ Done
            </Button>
          </div>
        )}

        {/* Variants View */}
        {viewMode === "variants" && variants.length > 0 && (
          <div className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">🔀</span>
                A/B Variants
              </h3>
              <Button size="sm" variant="secondary" onClick={handleReset} className="rounded-full">
                🔄 New
              </Button>
            </div>

            {/* Variant Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              {variants.map((variant, index) => (
                <button
                  key={variant.label}
                  onClick={() => setSelectedVariantIndex(index)}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    selectedVariantIndex === index
                      ? "bg-white text-primary shadow-md"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Variant {variant.label}
                  {variant.seoScore && (
                    <span className="ml-2 text-xs opacity-60">
                      ({variant.seoScore})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Selected Variant */}
            {variants[selectedVariantIndex] && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="rounded-full">{variants[selectedVariantIndex].hookStyle}</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopy(variants[selectedVariantIndex].content)}
                    className="rounded-full"
                  >
                    📋 Copy This Variant
                  </Button>
                </div>

                {/* Variant Scores */}
                <div className="flex gap-6">
                  <div className="text-sm">
                    <span className="text-text-secondary">SEO: </span>
                    <span className="font-bold text-primary">
                      {variants[selectedVariantIndex].seoScore ?? "--"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-text-secondary">Readability: </span>
                    <span className="font-bold text-primary">
                      {variants[selectedVariantIndex].readabilityScore?.toFixed(0) ?? "--"}
                    </span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border-2 border-border/50 shadow-inner max-h-[350px] overflow-y-auto">
                  <h4 className="font-semibold text-lg mb-4 pb-3 border-b border-border">
                    {variants[selectedVariantIndex].title}
                  </h4>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary leading-relaxed">
                    {variants[selectedVariantIndex].content}
                  </pre>
                </div>
              </div>
            )}

            <Button onClick={onClose} className="w-full py-4 rounded-xl text-base font-semibold" variant="primary">
              ✓ Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
