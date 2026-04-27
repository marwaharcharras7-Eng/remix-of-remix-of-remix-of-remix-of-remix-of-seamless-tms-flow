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
import { Plus, Send, Sparkles, Pencil, Info } from "lucide-react";
import { toast } from "sonner";
import { generateRef, TYPES_VEHICULE, REGIONS_MAROC } from "@/lib/tms-types";

export default function MisesADisposition() {
  const { hasRole, user } = useAuth();
  const canEdit = hasRole("plant_manager") || hasRole("manager_logistique") || hasRole("planificateur");
  const [items, setItems] = useState<any[]>([]);
  const [plannings, setPlannings] = useState<any[]>([]);
  const [prestataires, setPrestataires] = useState<any[]>([]);
  const [vehiculesDispo, setVehiculesDispo] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<{ planification_id: string; type_prestation: string; prestataire_id: string; date_debut_prevue: string; date_fin_prevue: string; type_vehicule_requis: string; nb_vehicules: string; region_destination: string; cout_estime: string; commentaire: string }>({
    planification_id: "none", type_prestation: "interne", prestataire_id: "none",
    date_debut_prevue: "", date_fin_prevue: "",
    type_vehicule_requis: TYPES_VEHICULE[0], nb_vehicules: "1",
    region_destination: REGIONS_MAROC[0],
    cout_estime: "0", commentaire: "",
  });

  // Dialog d'affectation manuelle (chauffeur)
  const [assignDialog, setAssignDialog] = useState<any | null>(null);
  const [assignVehicules, setAssignVehicules] = useState<any[]>([]);
  const [assignChauffeurs, setAssignChauffeurs] = useState<any[]>([]);
  // Pour chaque ligne mission à créer : { vehicule_id, chauffeur_id }
  const [assignRows, setAssignRows] = useState<{ vehicule_id: string; chauffeur_id: string }[]>([]);

  const load = async () => {
    const [{ data: m }, { data: pl }, { data: pr }, { data: vh }] = await Promise.all([
      supabase.from("mises_a_disposition").select("*, planifications(reference), prestataires(nom)").order("created_at", { ascending: false }),
      supabase.from("planifications").select("id, reference").eq("statut", "valide"),
      supabase.from("prestataires").select("id, nom"),
      supabase.from("vehicules").select("id, immatriculation, type_vehicule, flotte_id, statut").eq("statut", "disponible"),
    ]);
    setItems(m || []); setPlannings(pl || []); setPrestataires(pr || []); setVehiculesDispo(vh || []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    const now = new Date(); const tom = new Date(now.getTime() + 86400000);
    setForm({
      planification_id: "none", type_prestation: "interne", prestataire_id: "none",
      date_debut_prevue: now.toISOString().slice(0, 16), date_fin_prevue: tom.toISOString().slice(0, 16),
      type_vehicule_requis: TYPES_VEHICULE[0], nb_vehicules: "1",
      region_destination: REGIONS_MAROC[0],
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
      type_vehicule_requis: TYPES_VEHICULE.includes(m.type_vehicule_requis) ? m.type_vehicule_requis : TYPES_VEHICULE[0],
      nb_vehicules: String(m.nb_vehicules),
      region_destination: REGIONS_MAROC.includes(m.region_destination as any) ? m.region_destination : REGIONS_MAROC[0],
      cout_estime: String(m.cout_estime), commentaire: m.commentaire || "",
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
    toast.success(editing ? "✅ MAD mise à jour avec succès" : "✅ MAD créée avec succès");
    setOpen(false); load();
  };

  // Ouvrir le dialog d'affectation manuelle
  const openAssignDialog = async (m: any) => {
    // Charger véhicules dispo du bon type + chauffeurs dispo
    const [{ data: vehs }, { data: chauffs }] = await Promise.all([
      supabase
        .from("vehicules")
        .select("id, immatriculation, type_vehicule, flotte_id, flottes(nom)")
        .eq("statut", "disponible")
        .eq("type_vehicule", m.type_vehicule_requis),
      supabase
        .from("chauffeurs")
        .select("id, prenom, nom, flotte_id, disponibilite, flottes(nom)")
        .eq("disponibilite", true),
    ]);
    if (!vehs || vehs.length === 0) {
      toast.error(`Aucun véhicule disponible de type "${m.type_vehicule_requis}".`);
      return;
    }
    if (!chauffs || chauffs.length === 0) {
      toast.error("Aucun chauffeur disponible.");
      return;
    }
    setAssignDialog(m);
    setAssignVehicules(vehs);
    setAssignChauffeurs(chauffs);
    // Initialiser n lignes vides selon nb_vehicules
    setAssignRows(
      Array.from({ length: m.nb_vehicules }, () => ({ vehicule_id: "", chauffeur_id: "" }))
    );
  };

  // Confirmer l'affectation manuelle → créer les missions
  const confirmAssign = async () => {
    if (!assignDialog) return;
    const m = assignDialog;

    // Validation
    const filled = assignRows.filter(r => r.vehicule_id && r.chauffeur_id);
    if (filled.length === 0) {
      toast.error("Veuillez sélectionner au moins un couple véhicule + chauffeur.");
      return;
    }
    // Vérifier unicité (un véhicule ou chauffeur ne peut pas être affecté 2x)
    const vehIds = filled.map(r => r.vehicule_id);
    const chIds = filled.map(r => r.chauffeur_id);
    if (new Set(vehIds).size !== vehIds.length || new Set(chIds).size !== chIds.length) {
      toast.error("Un même véhicule ou chauffeur ne peut pas être affecté plusieurs fois.");
      return;
    }

    const missionsToInsert = filled.map(r => ({
      reference: generateRef("MIS"),
      mise_a_disposition_id: m.id,
      vehicule_id: r.vehicule_id,
      chauffeur_id: r.chauffeur_id,
      prestataire_id: m.prestataire_id,
      type_prestation: m.type_prestation,
      origine: "Dépôt principal",
      destination: m.region_destination,
      date_debut_prevue: m.date_debut_prevue,
      date_fin_prevue: m.date_fin_prevue,
      cout_estime: m.cout_estime / filled.length,
      statut: "affectee" as const,
    }));

    const { error: errMis } = await supabase.from("missions").insert(missionsToInsert);
    if (errMis) return toast.error(errMis.message);

    await supabase.from("vehicules").update({ statut: "affecte" }).in("id", vehIds);
    await supabase.from("chauffeurs").update({ disponibilite: false }).in("id", chIds);
    await supabase.from("mises_a_disposition").update({ statut: "affectee" }).eq("id", m.id);

    toast.success(`✅ ${filled.length} mission(s) créée(s) avec affectation manuelle`);
    setAssignDialog(null);
    load();
  };

  // Véhicules disponibles filtrés par type sélectionné (pour info/aperçu)
  const vehiculesCompatibles = vehiculesDispo.filter((v) => v.type_vehicule === form.type_vehicule_requis);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Mises à disposition" description="P3 — Demandes de transport (affectation chauffeur manuelle)"
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
                        {m.statut === "creee" && (
                          <Button size="sm" onClick={() => openAssignDialog(m)}>
                            <Sparkles className="mr-1 h-3.5 w-3.5" />Affecter & générer
                          </Button>
                        )}
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

      {/* Dialog Création / édition MAD */}
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
              <div className="space-y-1.5">
                <Label>Type véhicule requis *</Label>
                <Select value={form.type_vehicule_requis} onValueChange={(v) => setForm({ ...form, type_vehicule_requis: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES_VEHICULE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {vehiculesCompatibles.length} véhicule(s) disponible(s) de ce type
                </p>
              </div>
              <div className="space-y-1.5"><Label>Nb véhicules *</Label><Input type="number" min="1" value={form.nb_vehicules} onChange={(e) => setForm({ ...form, nb_vehicules: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Région destination *</Label>
                <Select value={form.region_destination} onValueChange={(v) => setForm({ ...form, region_destination: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGIONS_MAROC.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Coût estimé (MAD)</Label><Input type="number" step="0.01" value={form.cout_estime} onChange={(e) => setForm({ ...form, cout_estime: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Commentaire</Label><Textarea rows={2} value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} /></div>
            <div className="flex gap-2 rounded-md border border-info/30 bg-info/5 p-3 text-xs">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <p>
                Après création, cliquez sur <strong>"Affecter & générer"</strong> pour choisir
                <strong> manuellement</strong> les véhicules ET les chauffeurs à affecter.
              </p>
            </div>
            <DialogFooter><Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Affectation manuelle */}
      <Dialog open={!!assignDialog} onOpenChange={(o) => !o && setAssignDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Affectation manuelle — MAD {assignDialog?.reference}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Sélectionnez pour chaque mission le véhicule (type : <strong>{assignDialog?.type_vehicule_requis}</strong>) et le chauffeur de votre choix.
              {assignVehicules.length} véhicule(s) et {assignChauffeurs.length} chauffeur(s) disponibles.
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {assignRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center rounded-md border border-border p-2">
                  <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                  <Select
                    value={row.vehicule_id}
                    onValueChange={(v) => {
                      const next = [...assignRows]; next[idx] = { ...next[idx], vehicule_id: v }; setAssignRows(next);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Véhicule" /></SelectTrigger>
                    <SelectContent>
                      {assignVehicules.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.immatriculation} — {v.flottes?.nom || "Sans flotte"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={row.chauffeur_id}
                    onValueChange={(v) => {
                      const next = [...assignRows]; next[idx] = { ...next[idx], chauffeur_id: v }; setAssignRows(next);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Chauffeur" /></SelectTrigger>
                    <SelectContent>
                      {assignChauffeurs.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.prenom} {c.nom} — {c.flottes?.nom || "Sans flotte"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                Conseil : choisissez de préférence un chauffeur de la même flotte que le véhicule.
                Les missions non affectées (lignes vides) seront ignorées.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Annuler</Button>
            <Button onClick={confirmAssign}>
              <Sparkles className="mr-1 h-3.5 w-3.5" />Créer les missions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

