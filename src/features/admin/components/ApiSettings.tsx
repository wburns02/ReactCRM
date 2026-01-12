import { useState } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useOAuthClients,
  useCreateOAuthClient,
  useDeleteOAuthClient,
  useRegenerateClientSecret,
  useApiTokens,
  useCreateApiToken,
  useDeleteApiToken,
} from "@/api/hooks/useAdmin.ts";
import {
  OAUTH_SCOPES,
  type OAuthClient,
  type ApiAccessToken,
} from "@/api/types/admin.ts";
import { getErrorMessage } from "@/api/client.ts";
import { toastError, toastWarning } from "@/components/ui/Toast";
import { cn, formatDate } from "@/lib/utils.ts";

/**
 * API Settings - OAuth Client and API Token Management
 */
export function ApiSettings() {
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [showCreateTokenDialog, setShowCreateTokenDialog] = useState(false);
  const [newSecret, setNewSecret] = useState<{
    clientId: string;
    secret: string;
  } | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* OAuth Clients Section */}
      <OAuthClientsSection
        onCreateClick={() => setShowCreateClientDialog(true)}
        onSecretRegenerated={(clientId, secret) =>
          setNewSecret({ clientId, secret })
        }
      />

      {/* API Tokens Section */}
      <ApiTokensSection
        onCreateClick={() => setShowCreateTokenDialog(true)}
        onTokenCreated={(token) => setNewToken(token)}
      />

      {/* API Documentation Link */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <p className="text-sm text-text-secondary mt-1">
            Learn how to integrate with the CRM API
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">
                Base URL:{" "}
                <code className="bg-background-secondary px-2 py-1 rounded">
                  https://react-crm-api-production.up.railway.app/api/v2
                </code>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open("/docs/api", "_blank")}
            >
              View Documentation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create OAuth Client Dialog */}
      <CreateOAuthClientDialog
        open={showCreateClientDialog}
        onClose={() => setShowCreateClientDialog(false)}
        onCreated={(client) => {
          setShowCreateClientDialog(false);
          if (client.client_secret) {
            setNewSecret({
              clientId: client.client_id,
              secret: client.client_secret,
            });
          }
        }}
      />

      {/* Create API Token Dialog */}
      <CreateApiTokenDialog
        open={showCreateTokenDialog}
        onClose={() => setShowCreateTokenDialog(false)}
        onCreated={(token) => {
          setShowCreateTokenDialog(false);
          setNewToken(token);
        }}
      />

      {/* Show Secret Dialog */}
      {newSecret && (
        <SecretDisplayDialog
          title="Client Secret"
          description="This is the only time the client secret will be shown. Copy it now."
          secret={newSecret.secret}
          onClose={() => setNewSecret(null)}
        />
      )}

      {/* Show Token Dialog */}
      {newToken && (
        <SecretDisplayDialog
          title="API Access Token"
          description="This is the only time the access token will be shown. Copy it now."
          secret={newToken}
          onClose={() => setNewToken(null)}
        />
      )}
    </div>
  );
}

/**
 * OAuth Clients Management Section
 */
function OAuthClientsSection({
  onCreateClick,
  onSecretRegenerated,
}: {
  onCreateClick: () => void;
  onSecretRegenerated: (clientId: string, secret: string) => void;
}) {
  const { data: clients, isLoading } = useOAuthClients();
  const deleteClient = useDeleteOAuthClient();
  const regenerateSecret = useRegenerateClientSecret();

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the OAuth client "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteClient.mutateAsync(id);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  const handleRegenerateSecret = async (id: string, clientId: string) => {
    if (
      !confirm(
        "Are you sure you want to regenerate the client secret? The old secret will stop working immediately.",
      )
    ) {
      return;
    }
    try {
      const result = await regenerateSecret.mutateAsync(id);
      onSecretRegenerated(clientId, result.client_secret);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>OAuth Clients</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Manage OAuth 2.0 clients for third-party integrations
            </p>
          </div>
          <Button onClick={onCreateClick}>Create Client</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-text-secondary">Loading clients...</div>
        ) : !clients?.length ? (
          <div className="text-center py-8 text-text-secondary">
            <p>No OAuth clients configured</p>
            <p className="text-sm mt-1">
              Create a client to enable third-party API access
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {clients.map((client) => (
              <OAuthClientRow
                key={client.id}
                client={client}
                onDelete={() => handleDelete(client.id, client.name)}
                onRegenerateSecret={() =>
                  handleRegenerateSecret(client.id, client.client_id)
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OAuthClientRow({
  client,
  onDelete,
  onRegenerateSecret,
}: {
  client: OAuthClient;
  onDelete: () => void;
  onRegenerateSecret: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{client.name}</h4>
            <span
              className={cn(
                "px-2 py-0.5 text-xs rounded-full",
                client.is_active
                  ? "bg-success/10 text-success"
                  : "bg-text-muted/10 text-text-muted",
              )}
            >
              {client.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          {client.description && (
            <p className="text-sm text-text-secondary mt-1">
              {client.description}
            </p>
          )}
          <div className="mt-2 text-sm">
            <span className="text-text-muted">Client ID:</span>{" "}
            <code className="bg-background-secondary px-2 py-0.5 rounded text-xs">
              {client.client_id}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Less" : "More"}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          <div>
            <Label className="text-text-muted">Scopes</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {client.scopes.map((scope) => (
                <span
                  key={scope}
                  className="px-2 py-0.5 bg-background-secondary text-xs rounded"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Rate Limit:</span>{" "}
              {client.rate_limit} req/min
            </div>
            <div>
              <span className="text-text-muted">Created:</span>{" "}
              {formatDate(client.created_at)}
            </div>
            {client.last_used_at && (
              <div>
                <span className="text-text-muted">Last Used:</span>{" "}
                {formatDate(client.last_used_at)}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onRegenerateSecret}>
              Regenerate Secret
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * API Tokens Management Section
 */
function ApiTokensSection({
  onCreateClick,
  onTokenCreated: _onTokenCreated,
}: {
  onCreateClick: () => void;
  onTokenCreated: (token: string) => void;
}) {
  // _onTokenCreated is available for future use when token creation returns the new token
  const { data: tokens, isLoading } = useApiTokens();
  const deleteToken = useDeleteApiToken();

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke the API token "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteToken.mutateAsync(id);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Personal Access Tokens</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              API tokens for direct API access (scripts, automation)
            </p>
          </div>
          <Button onClick={onCreateClick}>Create Token</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-text-secondary">Loading tokens...</div>
        ) : !tokens?.length ? (
          <div className="text-center py-8 text-text-secondary">
            <p>No access tokens created</p>
            <p className="text-sm mt-1">
              Create a token for API access in scripts and automation
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <ApiTokenRow
                key={token.id}
                token={token}
                onDelete={() => handleDelete(token.id, token.name)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApiTokenRow({
  token,
  onDelete,
}: {
  token: ApiAccessToken;
  onDelete: () => void;
}) {
  const isExpired = token.expires_at && new Date(token.expires_at) < new Date();

  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{token.name}</span>
          {isExpired && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-error/10 text-error">
              Expired
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-text-secondary mt-1">
          <span>
            <code className="bg-background-secondary px-1 rounded">
              {token.token_prefix}...
            </code>
          </span>
          <span>Created {formatDate(token.created_at)}</span>
          {token.expires_at && (
            <span>Expires {formatDate(token.expires_at)}</span>
          )}
        </div>
      </div>
      <Button variant="destructive" size="sm" onClick={onDelete}>
        Revoke
      </Button>
    </div>
  );
}

/**
 * Create OAuth Client Dialog
 */
function CreateOAuthClientDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (client: OAuthClient) => void;
}) {
  const createClient = useCreateOAuthClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scopes: [] as string[],
    rate_limit: 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.scopes.length === 0) {
      toastWarning("Please provide a name and select at least one scope");
      return;
    }
    try {
      const client = await createClient.mutateAsync(formData);
      setFormData({ name: "", description: "", scopes: [], rate_limit: 1000 });
      onCreated(client);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  const toggleScope = (scopeId: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter((s) => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create OAuth Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="client-name">Client Name *</Label>
              <Input
                id="client-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="My Integration"
              />
            </div>

            <div>
              <Label htmlFor="client-description">Description</Label>
              <Input
                id="client-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>

            <div>
              <Label>Scopes *</Label>
              <p className="text-xs text-text-muted mb-2">
                Select the permissions this client should have
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                {OAUTH_SCOPES.map((scope) => (
                  <label
                    key={scope.id}
                    className="flex items-start gap-2 cursor-pointer hover:bg-background-secondary p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">{scope.label}</div>
                      <div className="text-xs text-text-muted">
                        {scope.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
              <Input
                id="rate-limit"
                type="number"
                min="100"
                max="10000"
                value={formData.rate_limit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rate_limit: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create API Token Dialog
 */
function CreateApiTokenDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (token: string) => void;
}) {
  const createToken = useCreateApiToken();
  const [formData, setFormData] = useState({
    name: "",
    scopes: [] as string[],
    expires_in_days: 90,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.scopes.length === 0) {
      toastWarning("Please provide a name and select at least one scope");
      return;
    }
    try {
      const result = await createToken.mutateAsync({
        name: formData.name,
        scopes: formData.scopes,
        expires_in_days: formData.expires_in_days || undefined,
      });
      setFormData({ name: "", scopes: [], expires_in_days: 90 });
      onCreated(result.access_token);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  const toggleScope = (scopeId: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter((s) => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Access Token</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="token-name">Token Name *</Label>
              <Input
                id="token-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="My Script Token"
              />
              <p className="text-xs text-text-muted mt-1">
                A descriptive name to identify this token
              </p>
            </div>

            <div>
              <Label>Scopes *</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                {OAUTH_SCOPES.map((scope) => (
                  <label
                    key={scope.id}
                    className="flex items-start gap-2 cursor-pointer hover:bg-background-secondary p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">{scope.label}</div>
                      <div className="text-xs text-text-muted">
                        {scope.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="expires">Expiration (days)</Label>
              <Input
                id="expires"
                type="number"
                min="0"
                max="365"
                value={formData.expires_in_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expires_in_days: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-text-muted mt-1">
                Set to 0 for no expiration (not recommended)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createToken.isPending}>
              {createToken.isPending ? "Creating..." : "Create Token"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Secret Display Dialog - shows generated secrets once
 */
function SecretDisplayDialog({
  title,
  description,
  secret,
  onClose,
}: {
  title: string;
  description: string;
  secret: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = secret;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-warning">{description}</p>
          </div>
          <div className="relative">
            <code className="block w-full p-3 bg-background-secondary rounded-lg text-sm font-mono break-all">
              {secret}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
