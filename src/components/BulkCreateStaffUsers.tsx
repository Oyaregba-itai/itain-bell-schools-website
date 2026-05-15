import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

interface StaffAccount {
  staff_id: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

export function BulkCreateStaffUsers() {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [results, setResults] = useState<{ successful: number; failed: number }>({ successful: 0, failed: 0 });
  const { toast } = useToast();

  const loadStaffAccounts = async () => {
    try {
      // This would load from staff_accounts.json if available
      // For now, we'll provide a manual upload mechanism
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event: any) => {
          try {
            const accounts = JSON.parse(event.target.result);
            setStaffAccounts(accounts);
          } catch {
            toast({
              title: "Error",
              description: "Invalid JSON file",
              variant: "destructive",
            });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load staff accounts",
        variant: "destructive",
      });
    }
  };

  const createStaffUsers = async () => {
    if (!staffAccounts.length) {
      toast({
        title: "Error",
        description: "No staff accounts loaded",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    let successful = 0;
    let failed = 0;

    for (const account of staffAccounts) {
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Create user profile
          const { error: profileError } = await supabase.from("users").insert([
            {
              id: authData.user.id,
              email: account.email,
              full_name: account.name,
              role: account.role || "teacher",
              staff_id: account.staff_id,
            },
          ]);

          if (profileError) throw profileError;
          successful++;
        }
      } catch (error: any) {
        console.error(`Failed to create user for ${account.email}:`, error);
        failed++;
      }
    }

    setResults({ successful, failed });
    toast({
      title: "Bulk Import Complete",
      description: `Created ${successful} users. Failed: ${failed}`,
    });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Import Staff Users
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Import Staff Users</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {staffAccounts.length === 0 ? (
            <Button onClick={loadStaffAccounts} variant="secondary" className="w-full">
              Upload staff_accounts.json
            </Button>
          ) : (
            <Card className="p-4 bg-blue-50">
              <p className="text-sm font-medium">{staffAccounts.length} staff accounts ready to import</p>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {staffAccounts.slice(0, 5).map((account) => (
                  <div key={account.staff_id} className="text-xs flex justify-between">
                    <span>{account.name}</span>
                    <Badge variant="outline">{account.email}</Badge>
                  </div>
                ))}
                {staffAccounts.length > 5 && (
                  <p className="text-xs text-gray-600">... and {staffAccounts.length - 5} more</p>
                )}
              </div>
            </Card>
          )}

          {results.successful > 0 && (
            <Card className="p-4 bg-green-50">
              <p className="text-sm">
                ✅ {results.successful} users created successfully
              </p>
              {results.failed > 0 && (
                <p className="text-sm text-red-600">❌ {results.failed} users failed</p>
              )}
            </Card>
          )}

          <Button
            onClick={createStaffUsers}
            disabled={loading || staffAccounts.length === 0}
            className="w-full"
          >
            {loading ? "Importing..." : `Create ${staffAccounts.length} Users`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
