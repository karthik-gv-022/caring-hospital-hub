import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Navigate } from "react-router-dom";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

const ApiKeys = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    const { data, error } = await supabase
      .from("api_keys" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch API keys",
        variant: "destructive",
      });
    } else {
      setApiKeys((data as unknown as ApiKey[]) || []);
    }
    setLoading(false);
  };

  const generateApiKey = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "medi_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const hashKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const key = generateApiKey();
    const keyHash = await hashKey(key);
    const keyPrefix = key.substring(0, 12) + "...";

    const { error } = await supabase.from("api_keys" as any).insert({
      user_id: user?.id,
      name: newKeyName.trim(),
      key_hash: keyHash,
      key_prefix: keyPrefix,
      is_active: true,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    } else {
      setNewKeyValue(key);
      toast({
        title: "API Key Created",
        description: "Make sure to copy it now - you won't be able to see it again!",
      });
      fetchApiKeys();
    }
    setCreating(false);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  const handleDeleteKey = async (id: string) => {
    const { error } = await supabase.from("api_keys" as any).delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "API key has been revoked",
      });
      fetchApiKeys();
    }
  };

  const handleToggleKey = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("api_keys" as any)
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update API key",
        variant: "destructive",
      });
    } else {
      toast({
        title: isActive ? "Disabled" : "Enabled",
        description: `API key has been ${isActive ? "disabled" : "enabled"}`,
      });
      fetchApiKeys();
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setNewKeyName("");
    setNewKeyValue(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-primary">
                <Key className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">API Keys</h1>
                <p className="text-muted-foreground">
                  Manage your API keys for programmatic access
                </p>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Generate New Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {newKeyValue ? "Your New API Key" : "Create API Key"}
                  </DialogTitle>
                  <DialogDescription>
                    {newKeyValue
                      ? "Copy this key now. You won't be able to see it again!"
                      : "Give your API key a name to identify it later."}
                  </DialogDescription>
                </DialogHeader>

                {newKeyValue ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                      {newKeyValue}
                    </div>
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleCopyKey(newKeyValue)}
                    >
                      <Copy className="w-4 h-4" />
                      Copy to Clipboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="e.g., Production API Key"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <DialogFooter>
                  {newKeyValue ? (
                    <Button onClick={closeDialog}>Done</Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={closeDialog}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateKey} disabled={creating}>
                        {creating ? "Creating..." : "Create Key"}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Info Card */}
          <Card className="p-4 mb-6 bg-accent/30 border-accent">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent-foreground mt-0.5" />
              <div>
                <p className="font-medium text-accent-foreground">
                  API Key Security
                </p>
                <p className="text-sm text-muted-foreground">
                  API keys provide full access to your account. Keep them secure
                  and never share them publicly. You can revoke a key at any time.
                </p>
              </div>
            </div>
          </Card>

          {/* API Keys List */}
          {loading ? (
            <Card className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </Card>
          ) : apiKeys.length === 0 ? (
            <Card className="p-12 text-center bg-gradient-card border-border/50">
              <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created any API keys yet.
              </p>
              <Button variant="hero" onClick={() => setIsDialogOpen(true)}>
                Create Your First Key
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <Card
                  key={apiKey.id}
                  className="p-4 bg-gradient-card border-border/50"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${
                          apiKey.is_active ? "bg-success/10" : "bg-muted"
                        }`}
                      >
                        <Key
                          className={`w-5 h-5 ${
                            apiKey.is_active
                              ? "text-success"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{apiKey.name}</h3>
                          <Badge
                            variant={apiKey.is_active ? "default" : "secondary"}
                          >
                            {apiKey.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {apiKey.key_prefix}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Created{" "}
                          {new Date(apiKey.created_at).toLocaleDateString()}
                        </div>
                        {apiKey.last_used_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Last used{" "}
                            {new Date(apiKey.last_used_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleKey(apiKey.id, apiKey.is_active)
                          }
                        >
                          {apiKey.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. Any applications
                                using this key will lose access immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteKey(apiKey.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ApiKeys;
