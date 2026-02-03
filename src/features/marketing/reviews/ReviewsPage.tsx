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
  usePendingReviews,
  useReplyToReview,
  useGenerateAIContent,
  type PendingReview,
} from "@/api/hooks/useMarketingHub.ts";
import {
  useAllSocialReviews,
  useReplyToFacebookReview,
  type SocialReview,
} from "@/api/hooks/useSocialIntegrations.ts";

type CombinedReview = (PendingReview | SocialReview) & {
  source: "gbp" | "yelp" | "facebook";
};

export function ReviewsPage() {
  const [selectedReview, setSelectedReview] = useState<CombinedReview | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const { data: reviewsData, isLoading: gbpLoading } = usePendingReviews();
  const { data: socialReviewsData, isLoading: socialLoading } =
    useAllSocialReviews();
  const replyMutation = useReplyToReview();
  const facebookReplyMutation = useReplyToFacebookReview();
  const generateContent = useGenerateAIContent();

  // Combine reviews from all sources
  const allReviews: CombinedReview[] = [
    ...(reviewsData?.reviews?.map((r) => ({ ...r, source: "gbp" as const })) ||
      []),
    ...(socialReviewsData?.reviews?.map((r) => ({
      ...r,
      source: r.platform as "yelp" | "facebook",
      responded: r.has_response,
    })) || []),
  ];

  // Filter by platform
  const filteredReviews =
    platformFilter === "all"
      ? allReviews
      : allReviews.filter((r) => r.source === platformFilter);

  const isLoading = gbpLoading || socialLoading;

  const handleGenerateResponse = async (review: CombinedReview) => {
    setIsGenerating(true);
    try {
      const result = await generateContent.mutateAsync({
        type: "ad_copy", // We'll use this as a general text generation
        context: {
          task: "review_response",
          rating: String(review.rating ?? 0),
          reviewText: review.text,
          authorName: review.author,
          businessName: "MAC Septic",
        },
      });

      // Extract the response from the AI result
      if (result.success && result.generated) {
        // Handle different response formats
        const content =
          typeof result.generated === "string"
            ? result.generated
            : JSON.stringify(result.generated);
        setReplyText(content);
      }
    } catch (error) {
      console.error("Failed to generate response:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    try {
      if (selectedReview.source === "facebook") {
        await facebookReplyMutation.mutateAsync({
          reviewId: selectedReview.id,
          reply: replyText,
        });
      } else {
        await replyMutation.mutateAsync({
          review_id: selectedReview.id,
          reply: replyText,
        });
      }
      setSelectedReview(null);
      setReplyText("");
    } catch (error) {
      console.error("Failed to submit reply:", error);
    }
  };

  const getPlatformBadge = (source: string) => {
    switch (source) {
      case "yelp":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            Yelp
          </Badge>
        );
      case "facebook":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Facebook
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Google
          </Badge>
        );
    }
  };

  const getReviewSentiment = (rating: number) => {
    if (rating >= 4) return { label: "Positive", variant: "success" as const };
    if (rating === 3) return { label: "Neutral", variant: "warning" as const };
    return { label: "Negative", variant: "danger" as const };
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
              Review Management
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Respond to customer reviews with AI assistance
            </p>
          </div>
        </div>
        <Badge variant="info">{allReviews.length} total</Badge>
      </div>

      {/* Platform Filter */}
      <div className="flex gap-2">
        {[
          { id: "all", label: "All Platforms" },
          { id: "gbp", label: "Google" },
          { id: "yelp", label: "Yelp" },
          { id: "facebook", label: "Facebook" },
        ].map((platform) => (
          <button
            key={platform.id}
            onClick={() => setPlatformFilter(platform.id)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              platformFilter === platform.id
                ? "bg-primary text-white"
                : "bg-surface-hover text-text-secondary hover:bg-surface-active"
            }`}
          >
            {platform.label}
            <span className="ml-1.5 text-xs opacity-70">
              (
              {platform.id === "all"
                ? allReviews.length
                : allReviews.filter((r) => r.source === platform.id).length}
              )
            </span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Total Reviews</div>
            <div className="text-2xl font-bold text-text-primary">
              {filteredReviews.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">5-Star</div>
            <div className="text-2xl font-bold text-success">
              {filteredReviews.filter((r) => r.rating === 5).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">4-Star</div>
            <div className="text-2xl font-bold text-primary">
              {filteredReviews.filter((r) => r.rating === 4).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Needs Attention</div>
            <div className="text-2xl font-bold text-warning">
              {
                filteredReviews.filter((r) => r.rating && r.rating <= 3)
                  .length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-24 bg-surface-hover rounded"></div>
                <div className="h-24 bg-surface-hover rounded"></div>
              </div>
            ) : filteredReviews.length ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {filteredReviews.map((review) => {
                  const rating = review.rating || 0;
                  const sentiment = getReviewSentiment(rating);
                  const responded =
                    "responded" in review
                      ? review.responded
                      : "has_response" in review
                        ? review.has_response
                        : false;
                  return (
                    <div
                      key={`${review.source}-${review.id}`}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedReview?.id === review.id &&
                        selectedReview?.source === review.source
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        setSelectedReview(review);
                        setReplyText("");
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getPlatformBadge(review.source)}
                            {rating > 0 && (
                              <span className="text-yellow-500">
                                {"★".repeat(Math.round(rating))}
                                {"☆".repeat(5 - Math.round(rating))}
                              </span>
                            )}
                            <Badge variant={sentiment.variant}>
                              {sentiment.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-text-primary mt-1">
                            {review.author}
                          </p>
                        </div>
                        <span className="text-xs text-text-secondary">
                          {"date" in review
                            ? typeof review.date === "string"
                              ? new Date(review.date).toLocaleDateString()
                              : review.date
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-3">
                        {review.text}
                      </p>
                      {responded && (
                        <Badge variant="success" className="mt-2">
                          Responded
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <span className="text-4xl mb-4 block">🎉</span>
                <p>All caught up! No pending reviews.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Panel */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedReview ? "Respond to Review" : "Select a Review"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedReview ? (
              <div className="space-y-4">
                {/* Selected Review */}
                <div className="p-4 bg-surface-hover rounded-lg">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getPlatformBadge(selectedReview.source)}
                    {selectedReview.rating && selectedReview.rating > 0 && (
                      <span className="text-yellow-500">
                        {"★".repeat(Math.round(selectedReview.rating))}
                        {"☆".repeat(5 - Math.round(selectedReview.rating))}
                      </span>
                    )}
                    <span className="text-sm font-medium">
                      {selectedReview.author}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">
                    {selectedReview.text}
                  </p>
                </div>

                {/* AI Generate Button */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleGenerateResponse(selectedReview)}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <>
                        <span className="animate-spin mr-2">⚡</span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🤖</span>
                        Generate AI Response
                      </>
                    )}
                  </Button>
                </div>

                {/* Response Templates */}
                <div className="flex flex-wrap gap-2">
                  <button
                    className="text-xs px-2 py-1 bg-surface-hover rounded hover:bg-surface-active"
                    onClick={() =>
                      setReplyText(
                        `Thank you for your wonderful review, ${selectedReview.author}! We're thrilled to hear about your positive experience with our team. Your satisfaction is our top priority, and we look forward to serving you again!`,
                      )
                    }
                  >
                    Positive Template
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-surface-hover rounded hover:bg-surface-active"
                    onClick={() =>
                      setReplyText(
                        `Thank you for your feedback, ${selectedReview.author}. We apologize for any inconvenience you experienced. We take all feedback seriously and would like to make things right. Please contact us directly so we can address your concerns.`,
                      )
                    }
                  >
                    Concern Template
                  </button>
                </div>

                {/* Response Text Area */}
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your response..."
                  className="w-full h-32 px-3 py-2 bg-surface border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedReview(null);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmitReply}
                    disabled={
                      !replyText.trim() ||
                      replyMutation.isPending ||
                      facebookReplyMutation.isPending ||
                      selectedReview?.source === "yelp"
                    }
                    className="flex-1"
                  >
                    {replyMutation.isPending || facebookReplyMutation.isPending
                      ? "Sending..."
                      : selectedReview?.source === "yelp"
                        ? "Reply on Yelp.com"
                        : "Send Response"}
                  </Button>
                </div>

                {selectedReview?.source === "yelp" ? (
                  <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                    <p className="text-xs text-warning-foreground">
                      Note: Yelp does not allow responding to reviews via their
                      API. Please respond directly on Yelp.com.
                    </p>
                  </div>
                ) : selectedReview?.source === "facebook" ? (
                  <p className="text-xs text-text-secondary">
                    Your response will be posted as a comment on Facebook.
                  </p>
                ) : (
                  <p className="text-xs text-text-secondary">
                    Note: Response will be queued. Connect Google Business
                    Profile to post directly.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-text-secondary">
                <span className="text-4xl mb-4 block">💬</span>
                <p>Select a review from the list to respond</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💡</span> Review Response Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-hover rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">
                Respond Quickly
              </h4>
              <p className="text-sm text-text-secondary">
                Aim to respond within 24-48 hours to show customers you value
                their feedback.
              </p>
            </div>
            <div className="p-4 bg-surface-hover rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">
                Be Professional
              </h4>
              <p className="text-sm text-text-secondary">
                Always maintain a professional tone, even when addressing
                negative reviews.
              </p>
            </div>
            <div className="p-4 bg-surface-hover rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">
                Personalize
              </h4>
              <p className="text-sm text-text-secondary">
                Address the reviewer by name and reference specific details from
                their review.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
