import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCog, Building2 } from "lucide-react";
import { AppRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/tms-types";
import { toast } from "sonner";

interface UserRow {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string | null;
  roles: AppRole[];
  flotte_ids: string[];
}

export default function Utilisateurs() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [flottes, setFlottes] = useState<{ id: string; nom: string }[]>([]);
  const [flotteDialog, setFlotteDialog] = useState<UserRow | null>(null);
  const [selectedFlottes, setSelectedFlottes] = useState<string[]>([]);

  const load = async () => {
    const [{ data: profiles }, { data: roles }, { data: rff }, { data: fls }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("responsable_flotte_flottes").select("*"),
      supabase.from("flottes").select("id, nom").order("nom"),
    ]);
    const merged: UserRow[] = (profiles || []).map((p: any) => ({
      ...p,
      roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role as AppRole),
      flotte_ids: (rff || []).filter((x: any) => x.user_id === p.user_id).map((x: any) => x.flotte_id),
    }));
    setUsers(merged);
    setFlottes(fls || []);
  };
  useEffect(() => { load(); }, []);

  const setRole = async (userId: string, newRole: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (error) return toast.error(error.message);

    // Si on sort du rôle responsable_flotte, on nettoie les liaisons
    if (newRole !== "responsable_flotte") {
      await supabase.from("responsable_flotte_flottes").delete().eq("user_id", userId);
    }
    toast.success(`Rôle mis à jour : ${ROLE_LABELS[newRole]}`);
    load();
  };

  const openFlottesDialog = (u: UserRow) => {
    setFlotteDialog(u);
    setSelectedFlottes(u.flotte_ids);
  };

  const saveFlottes = async () => {
    if (!flotteDialog) return;
    await supabase.from("responsable_flotte_flottes").delete().eq("user_id", flotteDialog.user_id);
    if (selectedFlottes.length > 0) {
      const { error } = await supabase.from("responsable_flotte_flottes").insert(
        selectedFlottes.map((flotte_id) => ({ user_id: flotteDialog.user_id, flotte_id }))
      );
      if (error) return toast.error(error.message);
    }
    toast.success(`✅ ${selectedFlottes.length} flotte(s) assignée(s) à ${flotteDialog.prenom} ${flotteDialog.nom}`);
    setFlotteDialog(null);
    load();
  };

  const toggleFlotte = (id: string) => {
    setSelectedFlottes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Utilisateurs & Rôles"
        description="Gestion des accès — affectez un rôle métier et, pour les responsables de flotte, leurs flottes assignées"
      />
      <div className="flex-1 p-6 space-y-4">
        {/* Légende des rôles */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">📋 Hiérarchie des rôles</h3>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-xs">
            {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
              <div key={r} className="rounded-md border border-border p-2">
                <Badge className="mb-1 bg-primary/15 text-primary border-primary/30">{ROLE_LABELS[r]}</Badge>
                <p className="text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <table className="w-full text-sm data-table">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rôle actuel</th>
                <th className="px-4 py-3 text-left">Modifier rôle</th>
                <th className="px-4 py-3 text-left">Flottes assignées</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">
                  <UserCog className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucun utilisateur
                </td></tr>
              ) : users.map((u) => {
                const isRespFlotte = u.roles.includes("responsable_flotte");
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{u.prenom} {u.nom}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.roles.length === 0 ? (
                        <Badge variant="outline">Aucun</Badge>
                      ) : u.roles.map((r) => (
                        <Badge key={r} className="mr-1 bg-primary/15 text-primary border-primary/30">
                          {ROLE_LABELS[r]}
                        </Badge>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      {u.user_id === currentUser?.id ? (
                        <span className="text-xs text-muted-foreground">(Vous)</span>
                      ) : (
                        <Select
                          value={u.roles[0] || ""}
                          onValueChange={(v) => setRole(u.user_id, v as AppRole)}
                        >
                          <SelectTrigger className="w-56"><SelectValue placeholder="Choisir un rôle" /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isRespFlotte ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {u.flotte_ids.length} flotte(s)
                          </span>
                          <Button size="sm" variant="outline" onClick={() => openFlottesDialog(u)}>
                            <Building2 className="mr-1 h-3.5 w-3.5" />Gérer
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-muted-foreground">
          ⚠️ Les nouveaux comptes reçoivent le rôle <strong>Chauffeur</strong> par défaut.
          Pour un <strong>Responsable de flotte</strong>, n'oubliez pas d'assigner ses flottes via le bouton "Gérer".
        </p>
      </div>

      {/* Dialog assignation flottes */}
      <Dialog open={!!flotteDialog} onOpenChange={(o) => !o && setFlotteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Flottes de {flotteDialog?.prenom} {flotteDialog?.nom}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {flottes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune flotte enregistrée.</p>
            ) : flottes.map((f) => (
              <label key={f.id} className="flex items-center gap-2 rounded-md border border-border p-2 hover:bg-muted/40 cursor-pointer">
                <Checkbox
                  checked={selectedFlottes.includes(f.id)}
                  onCheckedChange={() => toggleFlotte(f.id)}
                />
                <span className="text-sm">{f.nom}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlotteDialog(null)}>Annuler</Button>
            <Button onClick={saveFlottes}>Enregistrer ({selectedFlottes.length})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
