import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { toastSuccess, toastError, toastInfo } from "@/components/ui/Toast.tsx";
import {
  useAnthropicStatus,
  useAnthropicConnect,
  useAnthropicDisconnect,
  useAnthropicTest,
  useAnthropicUpdateConfig,
  useAnthropicUsage,
} from "@/api/hooks/useAnthropic.ts";
import { AI_FEATURE_LABELS, CLAUDE_MODELS } from "@/api/types/anthropic.ts";

/**
 * Claude AI (Anthropic) Integration Settings
 *
 * Manages API key connection, model selection, feature routing,
 * and usage/cost tracking.
 */
export function ClaudeSettings() {
  const { data: status, isLoading: statusLoading } = useAnthropicStatus();
  const [usagePeriod, setUsagePeriod] = useState("month");
  const { data: usage } = useAnthropicUsage(usagePeriod);
  const connectMutation = useAnthropicConnect();
  const disconnectMutation = useAnthropicDisconnect();
  const testMutation = useAnthropicTest();
  const updateConfigMutation = useAnthropicUpdateConfig();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const isConnected = status?.connected || false;

  const handleConnect = async () => {
    if (!apiKeyInput.trim()) {
      toastError("API Key Required", "Please enter your Anthropic API key");
      return;
    }
    try {
      await connectMutation.mutateAsync({
        api_key: apiKeyInput.trim(),
        model: "claude-sonnet-4-6",
        set_as_primary: true,
      });
      toastSuccess("Claude AI Connected", "API key validated and stored securely");
      setApiKeyInput("");
      setShowKeyInput(false);
    } catch (err: unknown) {
      const apiErr = err as Error & { response?: { data?: { detail?: string } } };
      toastError(
        "Connection Failed",
        apiErr?.response?.data?.detail || "Invalid API key or connection error",
      );
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Claude AI? The API key will be removed.")) return;
    try {
      await disconnectMutation.mutateAsync();
      toastSuccess("Claude AI Disconnected", "API key removed");
    } catch {
      toastError("Error", "Failed to disconnect Claude AI");
    }
  };

  const handleTest = async () => {
    try {
      const result = await testMutation.mutateAsync();
      if (result.success) {
        toastSuccess("Connection Successful", `${result.model} responded in ${result.response_time_ms}ms`);
      } else {
        toastError("Test Failed", result.message);
      }
    } catch {
      toastError("Test Failed", "Could not reach Anthropic API");
    }
  };

  const handleFeatureToggle = async (feature: string, enabled: boolean) => {
    try {
      await updateConfigMutation.mutateAsync({
        features: { ...status?.features_enabled, [feature]: enabled },
      });
      toastInfo("Feature Updated", `${AI_FEATURE_LABELS[feature] || feature} ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toastError("Error", "Failed to update feature configuration");
    }
  };

  const handlePrimaryToggle = async (isPrimary: boolean) => {
    try {
      await updateConfigMutation.mutateAsync({ is_primary: isPrimary });
      toastInfo("Updated", isPrimary ? "Claude set as primary AI provider" : "Claude removed as primary provider");
    } catch {
      toastError("Error", "Failed to update primary status");
    }
  };

  if (statusLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`} />
            Claude AI (Anthropic)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="font-medium text-green-600">Connected</p>
                </div>
                <div>
                  <span className="text-gray-500">Model</span>
                  <p className="font-medium">{status?.model || "claude-sonnet-4-6"}</p>
                </div>
                <div>
                  <span className="text-gray-500">API Key Source</span>
                  <p className="font-medium capitalize">{status?.api_key_source}</p>
                </div>
                <div>
                  <span className="text-gray-500">Primary Provider</span>
                  <p className="font-medium">{status?.is_primary ? "Yes" : "No"}</p>
                </div>
                {status?.connected_by && (
                  <div>
                    <span className="text-gray-500">Connected By</span>
                    <p className="font-medium">{status.connected_by}</p>
                  </div>
                )}
                {status?.connected_at && (
                  <div>
                    <span className="text-gray-500">Connected At</span>
                    <p className="font-medium">{new Date(status.connected_at).toLocaleDateString()}</p>
                  </div>
                )}
                {status?.last_used_at && (
                  <div>
                    <span className="text-gray-500">Last Used</span>
                    <p className="font-medium">{new Date(status.last_used_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleTest}
                  variant="secondary"
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? "Testing..." : "Test Connection"}
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="danger"
                  disabled={disconnectMutation.isPending}
                >
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Connect Claude AI to power intelligent chat, summarization, sentiment analysis, and more.
              </p>
              {showKeyInput ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anthropic API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full px-3 py-2 border rounded-md text-sm pr-16"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                      >
                        {showKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Your key is encrypted at rest and never stored in plaintext.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleConnect}
                      disabled={connectMutation.isPending || !apiKeyInput.trim()}
                    >
                      {connectMutation.isPending ? "Validating..." : "Connect"}
                    </Button>
                    <Button variant="secondary" onClick={() => { setShowKeyInput(false); setApiKeyInput(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowKeyInput(true)}>
                  Connect with API Key
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Model & Features (when connected) */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Model & Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Active Model</label>
              <select
                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                value={status?.model || "claude-sonnet-4-6"}
                onChange={(e) => updateConfigMutation.mutate({ model: e.target.value })}
              >
                {CLAUDE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Primary toggle */}
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium">Primary AI Provider</p>
                <p className="text-xs text-gray-500">Route AI requests through Claude instead of local Ollama</p>
              </div>
              <button
                onClick={() => handlePrimaryToggle(!status?.is_primary)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  status?.is_primary ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    status?.is_primary ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Feature Toggles */}
            <div>
              <p className="text-sm font-medium mb-2">Enabled Features</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(AI_FEATURE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                    <span className="text-sm">{label}</span>
                    <button
                      onClick={() => handleFeatureToggle(key, !(status?.features_enabled?.[key] ?? false))}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        status?.features_enabled?.[key] ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          status?.features_enabled?.[key] ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
                {/* Embeddings - always local */}
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md opacity-60">
                  <span className="text-sm">Embeddings</span>
                  <span className="text-xs text-gray-500">Always Local</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 3: Usage & Costs (when connected) */}
      {isConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Usage & Costs</CardTitle>
              <select
                className="px-2 py-1 border rounded text-sm bg-white"
                value={usagePeriod}
                onChange={(e) => setUsagePeriod(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{usage?.total_requests || 0}</p>
                <p className="text-xs text-gray-600">Requests</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">
                  {usage?.total_tokens ? (usage.total_tokens / 1000).toFixed(1) + "k" : "0"}
                </p>
                <p className="text-xs text-gray-600">Tokens</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  ${usage?.total_cost_usd?.toFixed(2) || "0.00"}
                </p>
                <p className="text-xs text-gray-600">Est. Cost</p>
              </div>
            </div>

            {/* By Feature */}
            {usage?.by_feature && usage.by_feature.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">By Feature</p>
                <div className="space-y-1">
                  {usage.by_feature.map((f) => (
                    <div key={f.feature} className="flex items-center justify-between text-sm py-1 px-2 bg-gray-50 rounded">
                      <span>{f.feature_label}</span>
                      <span className="text-gray-500">
                        {f.requests} req &middot; {(f.tokens / 1000).toFixed(1)}k tok &middot; ${f.cost_usd.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!usage?.by_feature || usage.by_feature.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">
                No usage data yet. Start using AI features to see statistics here.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card 4: Setup Instructions (when not connected) */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>
                Go to{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  console.anthropic.com/settings/keys
                </a>
              </li>
              <li>Create a new API key (or use an existing one)</li>
              <li>Copy the key and paste it in the Connect dialog above</li>
              <li>The key is validated against the Anthropic API before being stored</li>
              <li>Once connected, Claude will be available as your AI provider</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Security:</strong> Your API key is encrypted at rest using AES-256 (Fernet) encryption.
                It is never stored in plaintext or transmitted to any third party.
              </p>
            </div>
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>Pricing:</strong> Claude Sonnet 4.6 — $3 per million input tokens, $15 per million output tokens.
                Usage is tracked in the dashboard above.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
