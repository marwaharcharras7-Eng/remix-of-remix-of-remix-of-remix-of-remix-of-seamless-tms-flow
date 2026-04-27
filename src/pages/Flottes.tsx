import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { TYPES_TRANSPORT } from "@/lib/tms-types";

interface Flotte { id: string; nom: string; type_transport: string; responsable: string | null; }
interface Profile { user_id: string; nom: string; prenom: string; }

export default function Flottes() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("plant_manager") || hasRole("manager_logistique");
  const [items, setItems] = useState<Flotte[]>([]);
  const [responsables, setResponsables] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Flotte | null>(null);
  const [form, setForm] = useState<{ nom: string; type_transport: string; responsable: string }>({ nom: "", type_transport: TYPES_TRANSPORT[0], responsable: "none" });

  const load = async () => {
    // Liste des responsables = uniquement les utilisateurs ayant le rôle responsable_flotte
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "responsable_flotte");
    const respIds = (roleRows || []).map((r: any) => r.user_id);

    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from("flottes").select("*").order("nom"),
      respIds.length > 0
        ? supabase.from("profiles").select("user_id, nom, prenom").in("user_id", respIds).order("nom")
        : Promise.resolve({ data: [] as Profile[] }),
    ]);
    setItems(f || []);
    setResponsables((p as Profile[]) || []);
  };
  useEffect(() => { load(); }, []);


  const openNew = () => {
    setEditing(null);
    setForm({ nom: "", type_transport: TYPES_TRANSPORT[0], responsable: "none" });
    setOpen(true);
  };
  const openEdit = (f: Flotte) => {
    setEditing(f);
    setForm({ nom: f.nom, type_transport: f.type_transport, responsable: f.responsable || "none" });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nom: form.nom,
      type_transport: form.type_transport,
      responsable: form.responsable === "none" ? null : form.responsable,
    };
    const { error } = editing
      ? await supabase.from("flottes").update(payload).eq("id", editing.id)
      : await supabase.from("flottes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "✅ Flotte mise à jour avec succès" : "✅ Flotte créée avec succès");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette flotte ?")) return;
    const { error } = await supabase.from("flottes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("✅ Flotte supprimée"); load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Flottes" description="Groupes de véhicules par type de transport"
        actions={canEdit && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle flotte</Button>}
      />
      <div className="flex-1 p-6">
        <Card>
          <table className="w-full text-sm data-table">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Type transport</th>
              <th className="px-4 py-3 text-left">Responsable</th>
              {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Aucune flotte enregistrée
                </td></tr>
              ) : items.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{f.nom}</td>
                  <td className="px-4 py-3">{f.type_transport}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {f.responsable
                      ? (() => {
                          const r = responsables.find((p) => p.user_id === f.responsable);
                          return r ? `${r.prenom} ${r.nom}` : f.responsable;
                        })()
                      : "—"}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier flotte" : "Nouvelle flotte"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Type de transport *</Label>
              <Select value={form.type_transport} onValueChange={(v) => setForm({ ...form, type_transport: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES_TRANSPORT.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsable de la flotte</Label>
              <Select value={form.responsable} onValueChange={(v) => setForm({ ...form, responsable: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un responsable" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {responsables.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.prenom} {p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
