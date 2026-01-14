import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  useGenerateAIContent,
  useGenerateLandingPage,
  useGenerateBlogPost,
  useBlogIdeas,
  useIntegrationSettings,
} from "@/api/hooks/useMarketingHub.ts";

type ContentType =
  | "ad_copy"
  | "email_subject"
  | "blog_outline"
  | "social_post"
  | "landing_page"
  | "blog_post";

interface ContentOption {
  id: ContentType;
  label: string;
  icon: string;
  description: string;
}

const CONTENT_OPTIONS: ContentOption[] = [
  {
    id: "ad_copy",
    label: "Ad Copy",
    icon: "📢",
    description: "Google Ads headlines & descriptions",
  },
  {
    id: "email_subject",
    label: "Email Subject Lines",
    icon: "📧",
    description: "Catchy email subjects that convert",
  },
  {
    id: "social_post",
    label: "Social Posts",
    icon: "📱",
    description: "Facebook, Instagram, LinkedIn posts",
  },
  {
    id: "landing_page",
    label: "Landing Page",
    icon: "🖥️",
    description: "Service area landing pages",
  },
  {
    id: "blog_post",
    label: "Blog Post",
    icon: "📝",
    description: "SEO-optimized articles",
  },
  {
    id: "blog_outline",
    label: "Blog Outline",
    icon: "📋",
    description: "Quick blog post structure",
  },
];

export function AIContentPage() {
  const [selectedType, setSelectedType] = useState<ContentType>("ad_copy");
  const [formData, setFormData] = useState({
    service: "septic pumping",
    audience: "homeowners",
    location: "East Texas",
    campaign_type: "seasonal",
    offer: "maintenance discount",
    platform: "Facebook",
    theme: "educational",
    city: "",
    topic: "",
    keyword: "",
    word_count: 800,
  });
  const [generatedContent, setGeneratedContent] = useState<unknown>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const { data: settings } = useIntegrationSettings();
  const { data: blogIdeas } = useBlogIdeas();
  const generateContent = useGenerateAIContent();
  const generateLandingPage = useGenerateLandingPage();
  const generateBlogPost = useGenerateBlogPost();

  const isAIConfigured =
    settings?.integrations?.anthropic?.configured ||
    settings?.integrations?.openai?.configured;

  const handleGenerate = async () => {
    setGeneratedContent(null);
    setPreviewHtml("");

    try {
      if (selectedType === "landing_page") {
        const result = await generateLandingPage.mutateAsync({
          city: formData.city,
          service: formData.service,
          keywords: formData.keyword,
        });
        if (result.success) {
          setGeneratedContent(result.page_data);
          setPreviewHtml(result.preview_html);
        }
      } else if (selectedType === "blog_post") {
        const result = await generateBlogPost.mutateAsync({
          topic: formData.topic,
          keyword: formData.keyword,
          word_count: formData.word_count,
        });
        if (result.success) {
          setGeneratedContent(result.blog);
        }
      } else {
        // Convert formData to string values for the API
        const stringContext: Record<string, string> = {};
        for (const [key, value] of Object.entries(formData)) {
          stringContext[key] = String(value);
        }
        const result = await generateContent.mutateAsync({
          type: selectedType,
          context: stringContext,
        });
        if (result.success) {
          setGeneratedContent(result.generated);
        }
      }
    } catch (error) {
      console.error("Generation failed:", error);
    }
  };

  const isLoading =
    generateContent.isPending ||
    generateLandingPage.isPending ||
    generateBlogPost.isPending;

  const renderForm = () => {
    switch (selectedType) {
      case "ad_copy":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Service Focus
              </label>
              <select
                value={formData.service}
                onChange={(e) =>
                  setFormData({ ...formData, service: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
              >
                <option value="septic pumping">Septic Pumping</option>
                <option value="septic installation">Septic Installation</option>
                <option value="septic repair">Septic Repair</option>
                <option value="grease trap">Grease Trap Service</option>
                <option value="drain cleaning">Drain Cleaning</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Target Audience
              </label>
              <select
                value={formData.audience}
                onChange={(e) =>
                  setFormData({ ...formData, audience: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
              >
                <option value="homeowners">Homeowners</option>
                <option value="property managers">Property Managers</option>
                <option value="restaurants">Restaurants</option>
                <option value="commercial">Commercial Properties</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
                placeholder="e.g., East Texas, Tyler area"
              />
            </div>
          </div>
        );

      case "email_subject":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Campaign Type
              </label>
              <select
                value={formData.campaign_type}
                onChange={(e) =>
                  setFormData({ ...formData, campaign_type: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
              >
                <option value="seasonal">Seasonal Promotion</option>
                <option value="reminder">Service Reminder</option>
                <option value="newsletter">Newsletter</option>
                <option value="referral">Referral Program</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Offer/Message
              </label>
              <input
                type="text"
                value={formData.offer}
                onChange={(e) =>
                  setFormData({ ...formData, offer: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
                placeholder="e.g., 10% off spring maintenance"
              />
            </div>
          </div>
        );

      case "social_post":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Platform
              </label>
              <select
                value={formData.platform}
                onChange={(e) =>
                  setFormData({ ...formData, platform: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
              >
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter">Twitter/X</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Theme
              </label>
              <select
                value={formData.theme}
                onChange={(e) =>
                  setFormData({ ...formData, theme: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
              >
                <option value="educational">Educational Tips</option>
                <option value="promotional">Promotional</option>
                <option value="seasonal">Seasonal</option>
                <option value="testimonial">Customer Testimonial</option>
              </select>
            </div>
          </div>
        );

      case "landing_page":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                City/Area *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
                placeholder="e.g., Tyler, Longview, Jacksonville"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Service
              </label>
              <select
                value={formData.service}
                onChange={(e) =>
                  setFormData({ ...formData, service: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
              >
                <option value="septic-pumping">Septic Pumping</option>
                <option value="septic-installation">Septic Installation</option>
                <option value="septic-repair">Septic Repair</option>
                <option value="grease-trap">Grease Trap Service</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Target Keywords
              </label>
              <input
                type="text"
                value={formData.keyword}
                onChange={(e) =>
                  setFormData({ ...formData, keyword: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
                placeholder="e.g., septic pumping tyler tx"
              />
            </div>
          </div>
        );

      case "blog_post":
      case "blog_outline":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Topic *
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) =>
                  setFormData({ ...formData, topic: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
                placeholder="e.g., Signs Your Septic Tank Needs Pumping"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Target Keyword
              </label>
              <input
                type="text"
                value={formData.keyword}
                onChange={(e) =>
                  setFormData({ ...formData, keyword: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-md"
                placeholder="e.g., septic tank pumping signs"
              />
            </div>
            {selectedType === "blog_post" && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Word Count
                </label>
                <select
                  value={formData.word_count}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      word_count: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded-md"
                >
                  <option value={500}>~500 words (short)</option>
                  <option value={800}>~800 words (medium)</option>
                  <option value={1200}>~1200 words (long)</option>
                </select>
              </div>
            )}

            {/* Blog Ideas */}
            {blogIdeas?.ideas && (
              <div className="mt-4">
                <p className="text-sm font-medium text-text-primary mb-2">
                  Suggested Topics:
                </p>
                <div className="flex flex-wrap gap-2">
                  {blogIdeas.ideas
                    .slice(0, 5)
                    .map(
                      (
                        idea: { topic: string; keyword: string },
                        index: number,
                      ) => (
                        <button
                          key={index}
                          className="text-xs px-2 py-1 bg-surface-hover rounded hover:bg-surface-active"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              topic: idea.topic,
                              keyword: idea.keyword,
                            })
                          }
                        >
                          {idea.topic}
                        </button>
                      ),
                    )}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderGeneratedContent = () => {
    if (!generatedContent) return null;

    if (selectedType === "landing_page" && previewHtml) {
      return (
        <div className="space-y-4">
          <div className="border border-border rounded-lg overflow-hidden">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
          <div className="p-4 bg-surface-hover rounded-lg">
            <h4 className="font-medium mb-2">SEO Data:</h4>
            <p className="text-sm">
              <strong>Title:</strong>{" "}
              {(generatedContent as Record<string, string>).meta_title}
            </p>
            <p className="text-sm">
              <strong>Description:</strong>{" "}
              {(generatedContent as Record<string, string>).meta_description}
            </p>
          </div>
        </div>
      );
    }

    if (selectedType === "blog_post") {
      const blog = generatedContent as Record<string, unknown>;
      return (
        <div className="space-y-4">
          <div className="p-4 bg-surface-hover rounded-lg">
            <h3 className="text-lg font-semibold mb-2">
              {blog.title as string}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {blog.meta_description as string}
            </p>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: blog.content as string }}
            />
          </div>
        </div>
      );
    }

    // For other content types, display as formatted JSON or list
    if (typeof generatedContent === "object") {
      const content = generatedContent as Record<string, unknown>;
      const headlines = Array.isArray(content.headlines)
        ? (content.headlines as string[])
        : null;
      const descriptions = Array.isArray(content.descriptions)
        ? (content.descriptions as string[])
        : null;
      const subjects = Array.isArray(content.subjects)
        ? (content.subjects as string[])
        : null;
      const posts = Array.isArray(content.posts)
        ? (content.posts as Array<{
            text: string;
            suggested_hashtags?: string[];
          }>)
        : null;

      return (
        <div className="space-y-4">
          {headlines ? (
            <div>
              <h4 className="font-medium mb-2">Headlines:</h4>
              <ul className="space-y-2">
                {headlines.map((h: string, i: number) => (
                  <li
                    key={i}
                    className="p-2 bg-surface-hover rounded flex items-center justify-between"
                  >
                    <span>{h}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(h)}
                      className="text-xs text-primary hover:underline"
                    >
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {descriptions ? (
            <div>
              <h4 className="font-medium mb-2">Descriptions:</h4>
              <ul className="space-y-2">
                {descriptions.map((d: string, i: number) => (
                  <li
                    key={i}
                    className="p-2 bg-surface-hover rounded flex items-center justify-between"
                  >
                    <span className="flex-1">{d}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(d)}
                      className="text-xs text-primary hover:underline ml-2"
                    >
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {subjects ? (
            <div>
              <h4 className="font-medium mb-2">Subject Lines:</h4>
              <ul className="space-y-2">
                {subjects.map((s: string, i: number) => (
                  <li
                    key={i}
                    className="p-2 bg-surface-hover rounded flex items-center justify-between"
                  >
                    <span>{s}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(s)}
                      className="text-xs text-primary hover:underline"
                    >
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {posts ? (
            <div>
              <h4 className="font-medium mb-2">Social Posts:</h4>
              <div className="space-y-3">
                {posts.map((post, i: number) => (
                  <div key={i} className="p-3 bg-surface-hover rounded">
                    <p className="text-sm mb-2">{post.text}</p>
                    {post.suggested_hashtags && (
                      <p className="text-xs text-primary">
                        {post.suggested_hashtags.join(" ")}
                      </p>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(post.text)}
                      className="text-xs text-primary hover:underline mt-2"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="p-4 bg-surface-hover rounded-lg">
        <pre className="text-sm whitespace-pre-wrap">
          {JSON.stringify(generatedContent, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/marketing">
            <Button variant="ghost" size="sm">
              &larr; Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              AI Content Generator
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Generate marketing content with AI
            </p>
          </div>
        </div>
        {isAIConfigured ? (
          <Badge variant="success">AI Ready</Badge>
        ) : (
          <Badge variant="warning">Configure AI</Badge>
        )}
      </div>

      {!isAIConfigured && (
        <Card className="border-warning">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🤖</span>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">
                  AI Not Configured
                </h3>
                <p className="text-sm text-text-secondary">
                  Set up your AI provider (Claude or GPT) to enable content
                  generation.
                </p>
              </div>
              <Link to="/integrations">
                <Button variant="primary">Configure AI</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Type Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Content Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {CONTENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedType(option.id);
                    setGeneratedContent(null);
                    setPreviewHtml("");
                  }}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    selectedType === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <p className="font-medium text-text-primary">
                        {option.label}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configuration & Generation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Configure{" "}
              {CONTENT_OPTIONS.find((o) => o.id === selectedType)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderForm()}

            <div className="mt-6">
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={isLoading || !isAIConfigured}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⚡</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🤖</span>
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generated Content */}
      {generatedContent !== null && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>✨</span> Generated Content
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeneratedContent(null)}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>{renderGeneratedContent()}</CardContent>
        </Card>
      )}
    </div>
  );
}
