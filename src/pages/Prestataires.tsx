import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Briefcase } from "lucide-react";
import { toast } from "sonner";

export default function Prestataires() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("plant_manager") || hasRole("planificateur");
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nom: "", telephone: "", email: "", contrat_reference: "", cout_horaire: "" });

  const load = async () => { const { data } = await supabase.from("prestataires").select("*").order("nom"); setItems(data || []); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nom: "", telephone: "", email: "", contrat_reference: "", cout_horaire: "" }); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ nom: p.nom, telephone: p.telephone || "", email: p.email || "", contrat_reference: p.contrat_reference || "", cout_horaire: p.cout_horaire ? String(p.cout_horaire) : "" }); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nom: form.nom,
      telephone: form.telephone || null,
      email: form.email || null,
      contrat_reference: form.contrat_reference || null,
      cout_horaire: form.cout_horaire ? Number(form.cout_horaire) : null,
    };
    const { error } = editing ? await supabase.from("prestataires").update(payload).eq("id", editing.id) : await supabase.from("prestataires").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "✅ Prestataire mis à jour" : "✅ Prestataire créé avec succès");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce prestataire ?")) return;
    const { error } = await supabase.from("prestataires").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("✅ Prestataire supprimé"); load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Prestataires" description="Transporteurs externes" actions={canEdit && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau</Button>} />
      <div className="flex-1 p-6">
        <Card>
          <table className="w-full text-sm data-table">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Téléphone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Contrat</th>
              <th className="px-4 py-3 text-right">Coût/h</th>
              {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground"><Briefcase className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucun prestataire</td></tr>
              : items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{p.nom}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.telephone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email || "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono">{p.contrat_reference || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.cout_horaire ? `${Number(p.cout_horaire).toFixed(2)} MAD` : "—"}</td>
                  {canEdit && <td className="px-4 py-3 text-right"><Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>{hasRole("plant_manager") && <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau prestataire"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Réf. contrat</Label><Input value={form.contrat_reference} onChange={(e) => setForm({ ...form, contrat_reference: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Coût horaire (MAD)</Label><Input type="number" step="0.01" value={form.cout_horaire} onChange={(e) => setForm({ ...form, cout_horaire: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
