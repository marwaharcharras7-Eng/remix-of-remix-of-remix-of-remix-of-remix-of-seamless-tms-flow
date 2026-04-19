import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, ClipboardList, CheckCircle2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { generateRef } from "@/lib/tms-types";

export default function Plannings() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("administrateur") || hasRole("planificateur");
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ date_planification: new Date().toISOString().slice(0, 10), algorithme_utilise: "manuel", taux_remplissage: "0", commentaire: "" });

  const load = async () => { const { data } = await supabase.from("planifications").select("*").order("date_planification", { ascending: false }); setItems(data || []); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ date_planification: new Date().toISOString().slice(0, 10), algorithme_utilise: "manuel", taux_remplissage: "0", commentaire: "" }); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ date_planification: p.date_planification, algorithme_utilise: p.algorithme_utilise || "manuel", taux_remplissage: String(p.taux_remplissage || 0), commentaire: p.commentaire || "" }); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      date_planification: form.date_planification,
      algorithme_utilise: form.algorithme_utilise,
      taux_remplissage: Number(form.taux_remplissage),
      commentaire: form.commentaire || null,
    };
    if (!editing) payload.reference = generateRef("PLAN");
    const { error } = editing
      ? await supabase.from("planifications").update(payload).eq("id", editing.id)
      : await supabase.from("planifications").insert({ ...payload, statut: "brouillon" });
    if (error) return toast.error(error.message);
    toast.success(editing ? "Mis à jour" : "Planning créé"); setOpen(false); load();
  };

  const valider = async (p: any) => {
    if (!confirm(`Valider le planning ${p.reference} ? Cela déclenchera la génération automatique des mises à disposition.`)) return;
    const { error } = await supabase.from("planifications").update({ statut: "valide" }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Planning validé — créez maintenant les mises à disposition associées."); load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Plannings" description="P2 — Tournées de livraison & enlèvement" actions={canEdit && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau planning</Button>} />
      <div className="flex-1 p-6">
        <Card>
          <table className="w-full text-sm data-table">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left">Référence</th><th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Algorithme</th><th className="px-4 py-3 text-right">Taux remplissage</th>
              <th className="px-4 py-3 text-left">Statut</th>{canEdit && <th className="px-4 py-3 text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground"><ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucun planning</td></tr>
              : items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono font-medium">{p.reference}</td>
                  <td className="px-4 py-3">{new Date(p.date_planification).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{p.algorithme_utilise}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(p.taux_remplissage || 0).toFixed(1)} %</td>
                  <td className="px-4 py-3"><StatusBadge status={p.statut === "valide" ? "validee" : p.statut} /></td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      {p.statut === "brouillon" && <Button size="sm" variant="outline" onClick={() => valider(p)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Valider</Button>}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Modifier planning" : "Nouveau planning"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.date_planification} onChange={(e) => setForm({ ...form, date_planification: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Algorithme</Label><Input value={form.algorithme_utilise} onChange={(e) => setForm({ ...form, algorithme_utilise: e.target.value })} placeholder="manuel, optimisation, ..." /></div>
            <div className="space-y-1.5"><Label>Taux remplissage cible (%)</Label><Input type="number" step="0.1" value={form.taux_remplissage} onChange={(e) => setForm({ ...form, taux_remplissage: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Commentaire</Label><Textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} /></div>
            <DialogFooter><Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
