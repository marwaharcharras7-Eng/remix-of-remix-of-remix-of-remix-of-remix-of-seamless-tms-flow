import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog } from "lucide-react";
import { AppRole, ROLE_LABELS } from "@/lib/tms-types";
import { toast } from "sonner";

export default function Utilisateurs() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged = (profiles || []).map((p: any) => ({
      ...p,
      roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
    }));
    setUsers(merged);
  };
  useEffect(() => { load(); }, []);

  const setRole = async (userId: string, newRole: AppRole) => {
    // Remplace tous les rôles par le nouveau
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success(`Rôle mis à jour : ${ROLE_LABELS[newRole]}`); load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Utilisateurs" description="Gestion RBAC — affectez un rôle métier à chaque utilisateur" />
      <div className="flex-1 p-6">
        <Card>
          <table className="w-full text-sm data-table">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left">Nom</th><th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rôle actuel</th><th className="px-4 py-3 text-left">Modifier rôle</th>
            </tr></thead>
            <tbody>
              {users.length === 0 ? <tr><td colSpan={4} className="py-12 text-center text-muted-foreground"><UserCog className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucun utilisateur</td></tr>
              : users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{u.prenom} {u.nom}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.roles.length === 0 ? <Badge variant="outline">Aucun</Badge> : u.roles.map((r: AppRole) => (
                      <Badge key={r} className="mr-1 bg-primary/15 text-primary border-primary/30">{ROLE_LABELS[r]}</Badge>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    {u.user_id === currentUser?.id ? (
                      <span className="text-xs text-muted-foreground">(Vous)</span>
                    ) : (
                      <Select value={u.roles[0] || ""} onValueChange={(v) => setRole(u.user_id, v as AppRole)}>
                        <SelectTrigger className="w-56"><SelectValue placeholder="Choisir un rôle" /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-4 text-xs text-muted-foreground">⚠️ Les nouveaux comptes reçoivent le rôle <strong>Chauffeur</strong> par défaut. Vous devez ré-affecter manuellement les rôles Admin / Planificateur / Comptable / Direction.</p>
      </div>
    </div>
  );
}
