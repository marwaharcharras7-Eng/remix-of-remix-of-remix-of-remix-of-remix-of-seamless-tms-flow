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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Users, CheckCircle2, XCircle, Info } from "lucide-react";
import { toast } from "sonner";

export default function Chauffeurs() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("plant_manager") || hasRole("planificateur");
  const [items, setItems] = useState<any[]>([]);
  const [flottes, setFlottes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    nom: "", prenom: "", numero_permis: "", type_permis: "C", telephone: "",
    disponibilite: true, flotte_id: "none",
  });

  const load = async () => {
    const [{ data: c }, { data: f }] = await Promise.all([
      supabase.from("chauffeurs").select("*, flottes(nom)").order("nom"),
      supabase.from("flottes").select("id, nom"),
    ]);
    setItems(c || []); setFlottes(f || []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nom: "", prenom: "", numero_permis: "", type_permis: "C", telephone: "", disponibilite: true, flotte_id: "none" });
    setOpen(true);
  };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      nom: c.nom, prenom: c.prenom, numero_permis: c.numero_permis, type_permis: c.type_permis,
      telephone: c.telephone || "", disponibilite: c.disponibilite,
      flotte_id: c.flotte_id || "none",
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      nom: form.nom, prenom: form.prenom, numero_permis: form.numero_permis, type_permis: form.type_permis,
      telephone: form.telephone || null, disponibilite: form.disponibilite,
      flotte_id: form.flotte_id === "none" ? null : form.flotte_id,
    };
    // Conso initiale par défaut pour création (sera recalculée par trigger ensuite)
    if (!editing) payload.consommation_moyenne = 30;
    const { error } = editing
      ? await supabase.from("chauffeurs").update(payload).eq("id", editing.id)
      : await supabase.from("chauffeurs").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "✅ Chauffeur mis à jour" : "✅ Chauffeur créé avec succès");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce chauffeur ?")) return;
    const { error } = await supabase.from("chauffeurs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("✅ Chauffeur supprimé"); load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Chauffeurs" description="Gestion des opérateurs et disponibilités"
        actions={canEdit && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau chauffeur</Button>} />
      <div className="flex-1 p-6">
        <Card>
          <table className="w-full text-sm data-table">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Permis</th>
              <th className="px-4 py-3 text-left">Téléphone</th>
              <th className="px-4 py-3 text-left">Flotte</th>
              <th className="px-4 py-3 text-right">Performance</th>
              <th className="px-4 py-3 text-right">Conso (calc.)</th>
              <th className="px-4 py-3 text-right">Km parcourus</th>
              <th className="px-4 py-3 text-center">Disponible</th>
              {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucun chauffeur</td></tr>
              ) : items.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{c.prenom} {c.nom}</td>
                  <td className="px-4 py-3"><span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">{c.type_permis}</span> <span className="text-muted-foreground">{c.numero_permis}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.telephone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.flottes?.nom || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={Number(c.taux_performance) >= 80 ? "text-success" : Number(c.taux_performance) >= 60 ? "text-warning" : "text-destructive"}>
                      {Number(c.taux_performance).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(c.consommation_moyenne).toFixed(1)} L</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(c.km_parcourus_total).toLocaleString("fr-FR")} km</td>
                  <td className="px-4 py-3 text-center">{c.disponibilite ? <CheckCircle2 className="mx-auto h-4 w-4 text-success" /> : <XCircle className="mx-auto h-4 w-4 text-muted-foreground" />}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      {hasRole("plant_manager") && <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Modifier chauffeur" : "Nouveau chauffeur"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Prénom *</Label><Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>N° permis *</Label><Input value={form.numero_permis} onChange={(e) => setForm({ ...form, numero_permis: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Type permis</Label>
                <Select value={form.type_permis} onValueChange={(v) => setForm({ ...form, type_permis: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["B","C","C1","CE","D"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Flotte</Label>
                <Select value={form.flotte_id} onValueChange={(v) => setForm({ ...form, flotte_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Aucune</SelectItem>{flottes.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <Switch checked={form.disponibilite} onCheckedChange={(v) => setForm({ ...form, disponibilite: v })} />
              <Label>Disponible pour mission</Label>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 p-3 text-xs text-info">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <strong>Performance & consommation</strong> sont des KPI calculés automatiquement
                à partir des missions livrées (incidents, retards, écart conso). Pas besoin de saisir.
              </p>
            </div>
            <DialogFooter><Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
