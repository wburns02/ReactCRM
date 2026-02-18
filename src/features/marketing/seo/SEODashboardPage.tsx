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
  useSEOOverview,
  useBlogIdeas,
  useGenerateBlogPost,
  type BlogIdea,
} from "@/api/hooks/useMarketingHub.ts";

function ScoreRing({
  score,
  grade,
  label,
}: {
  score: number;
  grade: string;
  label: string;
}) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "text-green-500"
      : score >= 60
        ? "text-yellow-500"
        : score >= 40
          ? "text-orange-500"
          : "text-red-500";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-surface-hover"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-text-primary">{score}</span>
          <span className="text-xs font-medium text-text-secondary">
            {grade}
          </span>
        </div>
      </div>
      <span className="text-sm text-text-secondary mt-2">{label}</span>
    </div>
  );
}

function KeywordRow({
  keyword,
  position,
  change,
  volume,
}: {
  keyword: string;
  position: number;
  change: number;
  volume: number;
}) {
  return (
    <tr className="border-b border-border/50 hover:bg-surface-hover transition-colors">
      <td className="py-3 pr-4">
        <span className="text-sm font-medium text-text-primary">
          {keyword}
        </span>
      </td>
      <td className="py-3 pr-4">
        <span
          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
            position <= 3
              ? "bg-green-500/10 text-green-600"
              : position <= 10
                ? "bg-yellow-500/10 text-yellow-600"
                : "bg-red-500/10 text-red-600"
          }`}
        >
          {position}
        </span>
      </td>
      <td className="py-3 pr-4">
        {change > 0 ? (
          <span className="text-green-500 text-sm font-medium flex items-center gap-1">
            <span>↑</span>
            {change}
          </span>
        ) : change < 0 ? (
          <span className="text-red-500 text-sm font-medium flex items-center gap-1">
            <span>↓</span>
            {Math.abs(change)}
          </span>
        ) : (
          <span className="text-text-secondary text-sm">—</span>
        )}
      </td>
      <td className="py-3 text-sm text-text-secondary">
        {volume.toLocaleString()}/mo
      </td>
    </tr>
  );
}

export function SEODashboardPage() {
  const { data: seoData, isLoading: loadingSEO } = useSEOOverview();
  const { data: blogData, isLoading: loadingBlogs } = useBlogIdeas();
  const generateBlog = useGenerateBlogPost();
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  const seoScore = seoData?.overall_score?.overall || 0;
  const grade = seoData?.overall_score?.grade || "N/A";
  const trend = seoData?.overall_score?.trend || "neutral";
  const keywords = seoData?.keyword_rankings || [];
  const recommendations = seoData?.recommendations || [];
  const stats = (seoData as Record<string, unknown>)?.stats as {
    total_keywords?: number;
    improving?: number;
    declining?: number;
    top_3?: number;
  } | undefined;
  const blogIdeas: BlogIdea[] = blogData?.ideas || [];

  const handleGenerateBlog = async (idea: BlogIdea) => {
    setGeneratingTopic(idea.title);
    setGeneratedContent(null);
    try {
      const result = await generateBlog.mutateAsync({
        topic: idea.title,
        keyword: idea.title.split(":")[0],
        word_count: 800,
      });
      setGeneratedContent(result.content || "Content generation completed.");
    } catch {
      setGeneratedContent("Failed to generate content. Check AI configuration.");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/marketing"
              className="text-text-secondary hover:text-primary"
            >
              Marketing
            </Link>
            <span className="text-text-secondary">/</span>
            <h1 className="text-2xl font-semibold text-text-primary">
              SEO Dashboard
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Search engine optimization, keyword tracking & content strategy
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trend === "up" && <Badge variant="success">Trending Up</Badge>}
          {trend === "down" && <Badge variant="danger">Needs Attention</Badge>}
          {trend === "neutral" && <Badge variant="default">Stable</Badge>}
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>SEO Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSEO ? (
              <div className="flex justify-center py-8">
                <div className="animate-pulse w-24 h-24 rounded-full bg-surface-hover" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ScoreRing score={seoScore} grade={grade} label="Overall" />
                <div className="grid grid-cols-3 gap-4 w-full text-center">
                  <div>
                    <div className="text-lg font-bold text-text-primary">
                      {stats?.total_keywords || keywords.length}
                    </div>
                    <div className="text-xs text-text-secondary">Keywords</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-500">
                      {stats?.improving || 0}
                    </div>
                    <div className="text-xs text-text-secondary">Improving</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-500">
                      {stats?.declining || 0}
                    </div>
                    <div className="text-xs text-text-secondary">Declining</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyword Rankings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>🔑</span> Keyword Rankings
              </CardTitle>
              <Badge variant="info">
                {stats?.top_3 || 0} in top 3
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSEO ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-surface-hover rounded" />
                ))}
              </div>
            ) : keywords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-text-secondary uppercase">
                      <th className="pb-2 pr-4">Keyword</th>
                      <th className="pb-2 pr-4">Position</th>
                      <th className="pb-2 pr-4">Change</th>
                      <th className="pb-2">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map(
                      (
                        kw: {
                          keyword: string;
                          position: number;
                          change: number;
                          volume?: number;
                        },
                        i: number,
                      ) => (
                        <KeywordRow
                          key={i}
                          keyword={kw.keyword}
                          position={kw.position}
                          change={kw.change}
                          volume={kw.volume || 0}
                        />
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-text-secondary text-center py-8">
                No keyword data available yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEO Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💡</span> SEO Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map(
              (
                rec: {
                  type: string;
                  priority: string;
                  message: string;
                  impact?: string;
                },
                i: number,
              ) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-border bg-surface-secondary"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={
                        rec.priority === "high"
                          ? "danger"
                          : rec.priority === "medium"
                            ? "warning"
                            : "default"
                      }
                    >
                      {rec.priority}
                    </Badge>
                    <span className="text-xs text-text-secondary uppercase">
                      {rec.type}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">{rec.message}</p>
                  {rec.impact && (
                    <p className="text-xs text-success mt-2">{rec.impact}</p>
                  )}
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blog Ideas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>📝</span> Content Ideas
            </CardTitle>
            <Link to="/marketing/ai-content">
              <Button variant="secondary" size="sm">
                AI Content Studio
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBlogs ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-surface-hover rounded" />
              ))}
            </div>
          ) : blogIdeas.length > 0 ? (
            <div className="space-y-3">
              {blogIdeas.slice(0, 8).map((idea, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-border hover:bg-surface-hover transition-colors gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          idea.priority === "high"
                            ? "danger"
                            : idea.priority === "medium"
                              ? "warning"
                              : "default"
                        }
                      >
                        {idea.priority}
                      </Badge>
                      <Badge variant="info">{idea.category}</Badge>
                    </div>
                    <h4 className="font-medium text-text-primary text-sm">
                      {idea.title}
                    </h4>
                    <p className="text-xs text-text-secondary mt-1">
                      {idea.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">
                        {idea.estimated_traffic.toLocaleString()}
                      </div>
                      <div className="text-xs text-text-secondary">
                        est. traffic/mo
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleGenerateBlog(idea)}
                      disabled={generateBlog.isPending}
                    >
                      {generatingTopic === idea.title &&
                      generateBlog.isPending
                        ? "Generating..."
                        : "Generate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-center py-8">
              No blog ideas available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generated Content Preview */}
      {generatedContent && (
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
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    typeof generatedContent === "string"
                      ? generatedContent
                      : String(generatedContent),
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
