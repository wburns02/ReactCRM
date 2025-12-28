import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import {
  usePendingReviews,
  useReplyToReview,
  useGenerateAIContent,
  type PendingReview,
} from '@/api/hooks/useMarketingHub.ts';

export function ReviewsPage() {
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: reviewsData, isLoading } = usePendingReviews();
  const replyMutation = useReplyToReview();
  const generateContent = useGenerateAIContent();

  const handleGenerateResponse = async (review: PendingReview) => {
    setIsGenerating(true);
    try {
      const result = await generateContent.mutateAsync({
        type: 'ad_copy', // We'll use this as a general text generation
        context: {
          task: 'review_response',
          rating: String(review.rating),
          reviewText: review.text,
          authorName: review.author,
          businessName: 'MAC Septic',
        },
      });

      // Extract the response from the AI result
      if (result.success && result.generated) {
        // Handle different response formats
        const content = typeof result.generated === 'string'
          ? result.generated
          : JSON.stringify(result.generated);
        setReplyText(content);
      }
    } catch (error) {
      console.error('Failed to generate response:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    try {
      await replyMutation.mutateAsync({
        review_id: selectedReview.id,
        reply: replyText,
      });
      setSelectedReview(null);
      setReplyText('');
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
  };

  const getReviewSentiment = (rating: number) => {
    if (rating >= 4) return { label: 'Positive', variant: 'success' as const };
    if (rating === 3) return { label: 'Neutral', variant: 'warning' as const };
    return { label: 'Negative', variant: 'danger' as const };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/marketing">
            <Button variant="ghost" size="sm">&larr; Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Review Management</h1>
            <p className="text-sm text-text-secondary mt-1">
              Respond to customer reviews with AI assistance
            </p>
          </div>
        </div>
        <Badge variant="info">
          {reviewsData?.reviews?.length || 0} pending
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Total Reviews</div>
            <div className="text-2xl font-bold text-text-primary">
              {reviewsData?.reviews?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">5-Star</div>
            <div className="text-2xl font-bold text-success">
              {reviewsData?.reviews?.filter(r => r.rating === 5).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">4-Star</div>
            <div className="text-2xl font-bold text-primary">
              {reviewsData?.reviews?.filter(r => r.rating === 4).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Needs Attention</div>
            <div className="text-2xl font-bold text-warning">
              {reviewsData?.reviews?.filter(r => r.rating <= 3).length || 0}
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
            ) : reviewsData?.reviews?.length ? (
              <div className="space-y-4">
                {reviewsData.reviews.map((review) => {
                  const sentiment = getReviewSentiment(review.rating);
                  return (
                    <div
                      key={review.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedReview?.id === review.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedReview(review);
                        setReplyText('');
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-500">
                              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </span>
                            <Badge variant={sentiment.variant}>
                              {sentiment.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-text-primary mt-1">
                            {review.author}
                          </p>
                        </div>
                        <span className="text-xs text-text-secondary">{review.date}</span>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-3">
                        {review.text}
                      </p>
                      {review.responded && (
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
              {selectedReview ? 'Respond to Review' : 'Select a Review'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedReview ? (
              <div className="space-y-4">
                {/* Selected Review */}
                <div className="p-4 bg-surface-hover rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-500">
                      {'★'.repeat(selectedReview.rating)}{'☆'.repeat(5 - selectedReview.rating)}
                    </span>
                    <span className="text-sm font-medium">{selectedReview.author}</span>
                  </div>
                  <p className="text-sm text-text-primary">{selectedReview.text}</p>
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
                    onClick={() => setReplyText(
                      `Thank you for your wonderful review, ${selectedReview.author}! We're thrilled to hear about your positive experience with our team. Your satisfaction is our top priority, and we look forward to serving you again!`
                    )}
                  >
                    Positive Template
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-surface-hover rounded hover:bg-surface-active"
                    onClick={() => setReplyText(
                      `Thank you for your feedback, ${selectedReview.author}. We apologize for any inconvenience you experienced. We take all feedback seriously and would like to make things right. Please contact us directly so we can address your concerns.`
                    )}
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
                      setReplyText('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="flex-1"
                  >
                    {replyMutation.isPending ? 'Sending...' : 'Send Response'}
                  </Button>
                </div>

                <p className="text-xs text-text-secondary">
                  Note: Response will be queued. Connect Google Business Profile to post directly.
                </p>
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
              <h4 className="font-medium text-text-primary mb-2">Respond Quickly</h4>
              <p className="text-sm text-text-secondary">
                Aim to respond within 24-48 hours to show customers you value their feedback.
              </p>
            </div>
            <div className="p-4 bg-surface-hover rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">Be Professional</h4>
              <p className="text-sm text-text-secondary">
                Always maintain a professional tone, even when addressing negative reviews.
              </p>
            </div>
            <div className="p-4 bg-surface-hover rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">Personalize</h4>
              <p className="text-sm text-text-secondary">
                Address the reviewer by name and reference specific details from their review.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
