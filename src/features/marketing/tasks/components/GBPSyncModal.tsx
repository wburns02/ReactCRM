/**
 * GBP Sync Modal
 *
 * Google Business Profile sync and post management modal.
 * Shows sync status, profile stats, and allows creating GBP posts.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useGBPStatus, useTriggerGBPSync, useCreateGBPPost } from "@/api/hooks/useMarketingTasks";

interface GBPSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GBPSyncModal({ isOpen, onClose }: GBPSyncModalProps) {
  const [showPostForm, setShowPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");

  const { data: gbpStatus, isLoading, refetch } = useGBPStatus();
  const syncMutation = useTriggerGBPSync();
  const createPostMutation = useCreateGBPPost();
  const { addToast } = useToast();

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      addToast({
        title: "Sync Complete!",
        description: result.message,
        variant: "success",
      });
      refetch();
    } catch (error) {
      addToast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "error",
      });
    }
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      addToast({
        title: "Missing Information",
        description: "Please enter both a title and content for your post.",
        variant: "error",
      });
      return;
    }

    try {
      const result = await createPostMutation.mutateAsync({
        title: postTitle.trim(),
        content: postContent.trim(),
      });
      addToast({
        title: "Post Created!",
        description: result.message,
        variant: "success",
      });
      setShowPostForm(false);
      setPostTitle("");
      setPostContent("");
      refetch();
    } catch (error) {
      addToast({
        title: "Post Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "error",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">📍</span>
            Google Business Profile
          </DialogTitle>
          <p className="text-sm text-text-secondary mt-1">
            Manage your GBP profile, sync status, and create posts
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading GBP status...</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Demo Mode Banner */}
            {gbpStatus?.demoMode && (
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700 flex items-start gap-2">
                <span>💡</span>
                <div>
                  <div className="font-medium">Demo Mode Active</div>
                  <div className="text-xs mt-1">
                    GBP sync service runs locally. Connect via tunnel for live sync.
                  </div>
                </div>
              </div>
            )}

            {/* Profile Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏢</span>
                    <div>
                      <div className="font-semibold text-lg">{gbpStatus?.profileName || "Your Business"}</div>
                      <div className="text-sm text-text-secondary">
                        {gbpStatus?.connected ? (
                          <span className="text-green-600">● Connected</span>
                        ) : (
                          <span className="text-yellow-600">● Demo Mode</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleSync}
                    disabled={syncMutation.isPending}
                    variant="secondary"
                  >
                    {syncMutation.isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Syncing...
                      </>
                    ) : (
                      <>🔄 Sync Now</>
                    )}
                  </Button>
                </div>

                {gbpStatus?.lastSync && (
                  <div className="text-xs text-text-secondary">
                    Last synced: {formatDate(gbpStatus.lastSync)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Grid */}
            {gbpStatus?.stats && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold text-primary">{gbpStatus.stats.totalPosts}</div>
                    <div className="text-sm text-text-secondary">Posts</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold text-primary">{gbpStatus.stats.totalReviews}</div>
                    <div className="text-sm text-text-secondary">Reviews</div>
                    <div className="text-xs text-yellow-600 mt-1">
                      ⭐ {gbpStatus.stats.averageRating.toFixed(1)} avg
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold text-primary">{gbpStatus.stats.pendingResponses}</div>
                    <div className="text-sm text-text-secondary">Pending</div>
                    {gbpStatus.stats.pendingResponses > 0 && (
                      <div className="text-xs text-danger mt-1">Needs response</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Monthly Stats */}
            {gbpStatus?.stats && (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium text-text-secondary mb-3">This Month</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👀</span>
                      <div>
                        <div className="text-xl font-bold">{gbpStatus.stats.viewsThisMonth.toLocaleString()}</div>
                        <div className="text-xs text-text-secondary">Profile Views</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📞</span>
                      <div>
                        <div className="text-xl font-bold">{gbpStatus.stats.callsThisMonth}</div>
                        <div className="text-xs text-text-secondary">Phone Calls</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowPostForm(!showPostForm)}
                variant={showPostForm ? "secondary" : "primary"}
                className="flex-1"
              >
                {showPostForm ? "✕ Cancel" : "📝 Create Post"}
              </Button>
              {gbpStatus?.profileUrl && (
                <Button
                  onClick={() => window.open(gbpStatus.profileUrl, "_blank")}
                  variant="secondary"
                  className="flex-1"
                >
                  🔗 View Profile
                </Button>
              )}
            </div>

            {/* Post Creation Form */}
            {showPostForm && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Create GBP Post</span>
                    {gbpStatus?.demoMode && <Badge variant="secondary">Demo</Badge>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="post-title" className="text-sm font-medium text-text-secondary">
                      Post Title
                    </label>
                    <input
                      id="post-title"
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="e.g., Winter Septic Care Tips"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="post-content" className="text-sm font-medium text-text-secondary">
                      Post Content
                    </label>
                    <textarea
                      id="post-content"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Write your post content here..."
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    />
                    <div className="text-xs text-text-secondary">
                      {postContent.length}/1500 characters
                    </div>
                  </div>

                  <Button
                    onClick={handleCreatePost}
                    disabled={createPostMutation.isPending || !postTitle.trim() || !postContent.trim()}
                    variant="primary"
                    className="w-full"
                  >
                    {createPostMutation.isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Publishing...
                      </>
                    ) : (
                      <>🚀 Publish Post</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
