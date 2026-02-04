import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  useSocialIntegrationsStatus,
  useYelpBusinessSearch,
  useConnectYelpBusiness,
  useDisconnectYelp,
} from "@/api/hooks/useSocialIntegrations.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast";

/**
 * Yelp integration settings component
 */
export function YelpSettings() {
  const [searchName, setSearchName] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  const { data: status, isLoading: statusLoading } =
    useSocialIntegrationsStatus();
  const searchMutation = useYelpBusinessSearch();
  const connectMutation = useConnectYelpBusiness();
  const disconnectMutation = useDisconnectYelp();

  const yelpStatus = status?.yelp;
  const searchResults = searchMutation.data?.businesses || [];

  const handleSearch = async () => {
    if (!searchName || !searchLocation) {
      toastError("Please enter both business name and location");
      return;
    }

    try {
      await searchMutation.mutateAsync({
        name: searchName,
        location: searchLocation,
      });
    } catch {
      toastError("Failed to search Yelp");
    }
  };

  const handleConnect = async (businessId: string) => {
    try {
      const result = await connectMutation.mutateAsync(businessId);
      toastSuccess(`Connected to ${result.business_name}`);
      searchMutation.reset();
      setSearchName("");
      setSearchLocation("");
    } catch {
      toastError("Failed to connect Yelp business");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Yelp?")) return;

    try {
      await disconnectMutation.mutateAsync();
      toastSuccess("Yelp disconnected");
    } catch {
      toastError("Failed to disconnect Yelp");
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-bg-muted w-48 rounded" />
            <div className="h-10 bg-bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-2xl">Y</span>
          Yelp Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="p-4 bg-bg-hover rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Connection Status</p>
              {yelpStatus?.connected ? (
                <p className="text-sm text-text-secondary">
                  Connected to: {yelpStatus.business_name}
                </p>
              ) : (
                <p className="text-sm text-text-secondary">Not connected</p>
              )}
              {yelpStatus?.last_sync && (
                <p className="text-xs text-text-muted mt-1">
                  Last synced:{" "}
                  {new Date(yelpStatus.last_sync).toLocaleString()}
                </p>
              )}
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                yelpStatus?.connected ? "bg-success" : "bg-text-muted"
              }`}
            />
          </div>
        </div>

        {yelpStatus?.connected ? (
          <>
            {/* Connected State */}
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">
                Connected Business
              </h3>
              <p className="text-text-secondary">{yelpStatus.business_name}</p>
              <p className="text-sm text-text-muted">
                ID: {yelpStatus.business_id}
              </p>
            </div>

            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm text-warning-foreground">
                <strong>Note:</strong> Yelp's API does not support responding to
                reviews programmatically. Reviews are displayed for awareness
                only and must be managed directly on Yelp.
              </p>
            </div>

            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending
                ? "Disconnecting..."
                : "Disconnect Yelp"}
            </Button>
          </>
        ) : (
          <>
            {/* Search Form */}
            <div className="space-y-4">
              <p className="text-text-secondary">
                Search for your business on Yelp to connect it to your CRM.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yelp-name">Business Name</Label>
                  <Input
                    id="yelp-name"
                    type="text"
                    placeholder="e.g., Mac Septic Services"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="yelp-location">Location</Label>
                  <Input
                    id="yelp-location"
                    type="text"
                    placeholder="e.g., Dallas, TX"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleSearch}
                disabled={
                  !searchName || !searchLocation || searchMutation.isPending
                }
              >
                {searchMutation.isPending ? "Searching..." : "Search Yelp"}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-text-primary">
                  Search Results
                </h3>
                {searchResults.map((business) => (
                  <div
                    key={business.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {business.name}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {[business.address, business.city, business.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {business.rating && (
                        <p className="text-sm text-text-muted">
                          {business.rating} stars ({business.review_count}{" "}
                          reviews)
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleConnect(business.id)}
                      disabled={connectMutation.isPending}
                    >
                      {connectMutation.isPending ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchMutation.data && searchResults.length === 0 && (
              <p className="text-text-secondary">
                No businesses found. Try adjusting your search.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
