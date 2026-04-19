import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Flotte { id: string; nom: string; type_transport: string; responsable: string | null; }

export default function Flottes() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("administrateur");
  const [items, setItems] = useState<Flotte[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Flotte | null>(null);
  const [form, setForm] = useState({ nom: "", type_transport: "Routier", responsable: "" });

  const load = async () => {
    const { data } = await supabase.from("flottes").select("*").order("nom");
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nom: "", type_transport: "Routier", responsable: "" }); setOpen(true); };
  const openEdit = (f: Flotte) => { setEditing(f); setForm({ nom: f.nom, type_transport: f.type_transport, responsable: f.responsable || "" }); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { nom: form.nom, type_transport: form.type_transport, responsable: form.responsable || null };
    const { error } = editing
      ? await supabase.from("flottes").update(payload).eq("id", editing.id)
      : await supabase.from("flottes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Flotte mise à jour" : "Flotte créée");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette flotte ?")) return;
    const { error } = await supabase.from("flottes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimée"); load();
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
                  <td className="px-4 py-3 text-muted-foreground">{f.responsable || "—"}</td>
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
            <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Type de transport *</Label><Input value={form.type_transport} onChange={(e) => setForm({ ...form, type_transport: e.target.value })} required placeholder="Routier, Maritime, ..." /></div>
            <div className="space-y-1.5"><Label>Responsable</Label><Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></div>
            <DialogFooter><Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
