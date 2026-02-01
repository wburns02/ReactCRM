/**
 * ReviewsDetail Component
 *
 * Shows customer reviews when the Reviews metric card is clicked.
 * - Review cards with star ratings
 * - Author name, date, excerpt
 * - Response status (Responded/Pending)
 * - Filter by rating
 */

import { useState, useMemo } from "react";
import { useReviewDetails } from "@/api/hooks/useMarketingDetails";
import { CardSkeleton } from "./DetailDrawer";

interface ReviewsDetailProps {
  isEnabled: boolean;
}

export function ReviewsDetail({ isEnabled }: ReviewsDetailProps) {
  const { data, isLoading, error } = useReviewDetails(isEnabled);
  const [filter, setFilter] = useState<"all" | "pending" | "responded">("all");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const reviews = data?.reviews || [];

  // Filter reviews
  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    // Apply response status filter
    if (filter === "pending") {
      result = result.filter((r) => !r.responseText);
    } else if (filter === "responded") {
      result = result.filter((r) => r.responseText);
    }

    // Apply rating filter
    if (ratingFilter !== null) {
      result = result.filter((r) => r.rating === ratingFilter);
    }

    // Sort by date (newest first)
    result.sort(
      (a, b) =>
        new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
    );

    return result;
  }, [reviews, filter, ratingFilter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rating ? "text-yellow-400" : "text-gray-300"}
        >
          ★
        </span>
      ))}
    </div>
  );

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return <CardSkeleton count={4} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-4xl mb-2">⚠️</div>
        <p className="text-gray-600">Failed to load review data</p>
        <p className="text-sm text-gray-400 mt-1">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 px-3 py-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-900">{reviews.length}</div>
          <div className="text-xs text-gray-500">Total Reviews</div>
        </div>
        <div className="bg-yellow-50 px-3 py-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {data?.averageRating?.toFixed(1) || "—"}
          </div>
          <div className="text-xs text-yellow-600">Avg Rating</div>
        </div>
        <div className="bg-red-50 px-3 py-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">
            {data?.pendingResponses || 0}
          </div>
          <div className="text-xs text-red-600">Need Response</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-brand-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "pending"
              ? "bg-red-500 text-white"
              : "bg-red-50 text-red-600 hover:bg-red-100"
          }`}
        >
          ⏳ Pending ({reviews.filter((r) => !r.responseText).length})
        </button>
        <button
          onClick={() => setFilter("responded")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "responded"
              ? "bg-green-500 text-white"
              : "bg-green-50 text-green-600 hover:bg-green-100"
          }`}
        >
          ✅ Responded ({reviews.filter((r) => r.responseText).length})
        </button>
      </div>

      {/* Rating filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Filter by rating:</span>
        <div className="flex gap-1">
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => setRatingFilter(ratingFilter === rating ? null : rating)}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                ratingFilter === rating
                  ? "bg-yellow-400 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {rating}★
            </button>
          ))}
        </div>
        {ratingFilter !== null && (
          <button
            onClick={() => setRatingFilter(null)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Review cards */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter !== "all" || ratingFilter !== null
              ? "No reviews match your filters"
              : "No reviews yet"}
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`border rounded-lg p-4 transition-colors ${
                review.responseText
                  ? "border-gray-200 bg-white"
                  : "border-red-200 bg-red-50/30"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                    {review.author[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{review.author}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{review.platform}</span>
                      <span>•</span>
                      <span>{formatDate(review.reviewDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} />
                  <span className={`font-bold ${getRatingColor(review.rating)}`}>
                    {review.rating}.0
                  </span>
                </div>
              </div>

              {/* Review text */}
              <p className="text-gray-700 mb-3">{review.reviewText}</p>

              {/* Response */}
              {review.responseText ? (
                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className="font-medium">Your Response</span>
                    {review.respondedAt && (
                      <span>• {formatDate(review.respondedAt)}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{review.responseText}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                  <span>⏳</span>
                  <span className="font-medium">Awaiting response</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 text-center pt-2">
        Reviews synced from Google Business Profile
      </p>
    </div>
  );
}
