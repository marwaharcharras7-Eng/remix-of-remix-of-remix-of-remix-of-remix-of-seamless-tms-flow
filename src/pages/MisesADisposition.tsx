import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Send, Sparkles, Pencil } from "lucide-react";
import { toast } from "sonner";
import { generateRef } from "@/lib/tms-types";

export default function MisesADisposition() {
  const { hasRole, user } = useAuth();
  const canEdit = hasRole("administrateur") || hasRole("planificateur");
  const [items, setItems] = useState<any[]>([]);
  const [plannings, setPlannings] = useState<any[]>([]);
  const [prestataires, setPrestataires] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    planification_id: "none", type_prestation: "interne", prestataire_id: "none",
    date_debut_prevue: "", date_fin_prevue: "",
    type_vehicule_requis: "Camion", nb_vehicules: "1", region_destination: "",
    cout_estime: "0", commentaire: "",
  });

  const load = async () => {
    const [{ data: m }, { data: pl }, { data: pr }] = await Promise.all([
      supabase.from("mises_a_disposition").select("*, planifications(reference), prestataires(nom)").order("created_at", { ascending: false }),
      supabase.from("planifications").select("id, reference").eq("statut", "valide"),
      supabase.from("prestataires").select("id, nom"),
    ]);
    setItems(m || []); setPlannings(pl || []); setPrestataires(pr || []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    const now = new Date(); const tom = new Date(now.getTime() + 86400000);
    setForm({
      planification_id: "none", type_prestation: "interne", prestataire_id: "none",
      date_debut_prevue: now.toISOString().slice(0, 16), date_fin_prevue: tom.toISOString().slice(0, 16),
      type_vehicule_requis: "Camion", nb_vehicules: "1", region_destination: "",
      cout_estime: "0", commentaire: "",
    });
    setOpen(true);
  };
  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      planification_id: m.planification_id || "none", type_prestation: m.type_prestation,
      prestataire_id: m.prestataire_id || "none",
      date_debut_prevue: m.date_debut_prevue.slice(0, 16), date_fin_prevue: m.date_fin_prevue.slice(0, 16),
      type_vehicule_requis: m.type_vehicule_requis, nb_vehicules: String(m.nb_vehicules),
      region_destination: m.region_destination, cout_estime: String(m.cout_estime), commentaire: m.commentaire || "",
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      planification_id: form.planification_id === "none" ? null : form.planification_id,
      type_prestation: form.type_prestation,
      prestataire_id: form.prestataire_id === "none" ? null : form.prestataire_id,
      date_debut_prevue: form.date_debut_prevue,
      date_fin_prevue: form.date_fin_prevue,
      type_vehicule_requis: form.type_vehicule_requis,
      nb_vehicules: Number(form.nb_vehicules),
      region_destination: form.region_destination,
      cout_estime: Number(form.cout_estime),
      commentaire: form.commentaire || null,
    };
    if (!editing) { payload.reference = generateRef("MAD"); payload.created_by = user?.id; }
    const { error } = editing
      ? await supabase.from("mises_a_disposition").update(payload).eq("id", editing.id)
      : await supabase.from("mises_a_disposition").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "MAD mise à jour" : "MAD créée"); setOpen(false); load();
  };

  // P3 : génération automatique des missions depuis la MAD
  const genererMissions = async (m: any) => {
    if (!confirm(`Générer ${m.nb_vehicules} mission(s) depuis cette MAD et l'affecter aux véhicules disponibles ?`)) return;

    // Récupérer véhicules dispo + chauffeurs dispo
    const { data: vehs } = await supabase.from("vehicules").select("id").eq("statut", "disponible").limit(m.nb_vehicules);
    const { data: chauffs } = await supabase.from("chauffeurs").select("id").eq("disponibilite", true).limit(m.nb_vehicules);

    if (!vehs || vehs.length === 0) { toast.error("Aucun véhicule disponible. Vérifiez le module Véhicules."); return; }
    const nbToCreate = Math.min(vehs.length, chauffs?.length || 0, m.nb_vehicules);
    if (nbToCreate === 0) { toast.error("Aucun chauffeur disponible."); return; }

    const missionsToInsert = [];
    for (let i = 0; i < nbToCreate; i++) {
      missionsToInsert.push({
        reference: generateRef("MIS"),
        mise_a_disposition_id: m.id,
        vehicule_id: vehs[i].id,
        chauffeur_id: chauffs![i].id,
        prestataire_id: m.prestataire_id,
        type_prestation: m.type_prestation,
        origine: "Dépôt principal",
        destination: m.region_destination,
        date_debut_prevue: m.date_debut_prevue,
        date_fin_prevue: m.date_fin_prevue,
        cout_estime: m.cout_estime / m.nb_vehicules,
        statut: "affectee",
      });
    }

    const { error: errMis } = await supabase.from("missions").insert(missionsToInsert);
    if (errMis) return toast.error(errMis.message);

    // Mettre à jour véhicules & chauffeurs en "affecté"
    await supabase.from("vehicules").update({ statut: "affecte" }).in("id", vehs.slice(0, nbToCreate).map((v) => v.id));
    await supabase.from("chauffeurs").update({ disponibilite: false }).in("id", chauffs!.slice(0, nbToCreate).map((c) => c.id));
    await supabase.from("mises_a_disposition").update({ statut: "affectee" }).eq("id", m.id);

    toast.success(`${nbToCreate} mission(s) créée(s) et affectée(s) automatiquement`);
    load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Mises à disposition" description="P3 — Demandes de transport (génération auto possible)"
        actions={canEdit && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle MAD</Button>} />
      <div className="flex-1 p-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead><tr className="border-b border-border">
                <th className="px-4 py-3 text-left">Réf.</th><th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Région</th><th className="px-4 py-3 text-right">Nb véh.</th>
                <th className="px-4 py-3 text-left">Date début</th><th className="px-4 py-3 text-right">Coût est.</th>
                <th className="px-4 py-3 text-left">Statut</th>{canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-muted-foreground"><Send className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucune MAD</td></tr>
                : items.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono font-medium">{m.reference}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.type_prestation} /></td>
                    <td className="px-4 py-3">{m.region_destination}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{m.nb_vehicules}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(m.date_debut_prevue).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(m.cout_estime).toLocaleString("fr-FR")} MAD</td>
                    <td className="px-4 py-3"><StatusBadge status={m.statut} /></td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        {m.statut === "creee" && <Button size="sm" onClick={() => genererMissions(m)}><Sparkles className="mr-1 h-3.5 w-3.5" />Générer missions</Button>}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Modifier MAD" : "Nouvelle mise à disposition"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Planning lié</Label>
                <Select value={form.planification_id} onValueChange={(v) => setForm({ ...form, planification_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Aucun</SelectItem>{plannings.map((p) => <SelectItem key={p.id} value={p.id}>{p.reference}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Type prestation *</Label>
                <Select value={form.type_prestation} onValueChange={(v) => setForm({ ...form, type_prestation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="interne">Interne</SelectItem><SelectItem value="externe">Externe</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {form.type_prestation === "externe" && (
              <div className="space-y-1.5"><Label>Prestataire</Label>
                <Select value={form.prestataire_id} onValueChange={(v) => setForm({ ...form, prestataire_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem>{prestataires.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Début prévu *</Label><Input type="datetime-local" value={form.date_debut_prevue} onChange={(e) => setForm({ ...form, date_debut_prevue: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Fin prévue *</Label><Input type="datetime-local" value={form.date_fin_prevue} onChange={(e) => setForm({ ...form, date_fin_prevue: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type véhicule *</Label><Input value={form.type_vehicule_requis} onChange={(e) => setForm({ ...form, type_vehicule_requis: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Nb véhicules *</Label><Input type="number" min="1" value={form.nb_vehicules} onChange={(e) => setForm({ ...form, nb_vehicules: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Région destination *</Label><Input value={form.region_destination} onChange={(e) => setForm({ ...form, region_destination: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Coût estimé (MAD)</Label><Input type="number" step="0.01" value={form.cout_estime} onChange={(e) => setForm({ ...form, cout_estime: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Commentaire</Label><Textarea rows={2} value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} /></div>
            <DialogFooter><Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
