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
import { Plus, ClipboardList, CheckCircle2, Pencil, Info, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { generateRef } from "@/lib/tms-types";

const ALGORITHMES = [
  { value: "manuel", label: "Manuel", desc: "Le planificateur affecte lui-même les véhicules et chauffeurs aux MAD. Aucune optimisation auto. Idéal quand peu de tournées ou contraintes spécifiques." },
  { value: "fifo", label: "FIFO (premier arrivé, premier servi)", desc: "Les MAD sont traitées dans l'ordre chronologique de création. Simple mais peut sous-optimiser le remplissage." },
  { value: "remplissage_max", label: "Remplissage maximum", desc: "Cherche à charger chaque véhicule au plus près de sa capacité tonnage. Réduit le nombre de véhicules nécessaires." },
  { value: "cout_min", label: "Coût minimum", desc: "Minimise le coût total estimé (carburant + main d'œuvre + amortissement). Privilégie véhicules économes et chauffeurs proches." },
  { value: "regroupement_zone", label: "Regroupement par zone", desc: "Regroupe les MAD par région destination pour mutualiser les tournées. Optimise les km parcourus." },
];

export default function Plannings() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("administrateur") || hasRole("planificateur");
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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
    toast.success(editing ? "✅ Planning mis à jour" : "✅ Planning créé avec succès");
    setOpen(false); load();
  };

  const valider = async (p: any) => {
    if (!confirm(`Valider le planning ${p.reference} ? Cela déclenchera la génération automatique des mises à disposition.`)) return;
    const { error } = await supabase.from("planifications").update({ statut: "valide" }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("✅ Planning validé — vous pouvez maintenant créer les MAD associées."); load();
  };

  const algoChoisi = ALGORITHMES.find((a) => a.value === form.algorithme_utilise);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Plannings"
        description="P2 — Tournées de livraison & enlèvement"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setHelpOpen(true)}><HelpCircle className="mr-2 h-4 w-4" />Comprendre les plannings</Button>
            {canEdit && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau planning</Button>}
          </div>
        }
      />
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

      {/* Dialog création/édition planning */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier planning" : "Nouveau planning"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            {/* Bandeau d'aide */}
            <div className="flex gap-2 rounded-md border border-info/30 bg-info/5 p-3 text-xs">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <p>
                Un <strong>planning</strong> représente l'ensemble des tournées prévues pour une journée donnée.
                Une fois validé, il sert de base à la création des <strong>mises à disposition</strong> (MAD)
                qui réservent véhicules et chauffeurs.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Date de planification *</Label>
              <Input type="date" value={form.date_planification} onChange={(e) => setForm({ ...form, date_planification: e.target.value })} required />
              <p className="text-xs text-muted-foreground">Jour pour lequel les tournées sont planifiées (généralement J+1).</p>
            </div>

            <div className="space-y-1.5">
              <Label>Algorithme d'optimisation *</Label>
              <Select value={form.algorithme_utilise} onValueChange={(v) => setForm({ ...form, algorithme_utilise: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALGORITHMES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {algoChoisi && (
                <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                  <strong className="text-foreground">{algoChoisi.label}</strong> — {algoChoisi.desc}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Taux de remplissage cible (%)</Label>
              <Input type="number" step="0.1" min="0" max="100" value={form.taux_remplissage} onChange={(e) => setForm({ ...form, taux_remplissage: e.target.value })} />
              <p className="text-xs text-muted-foreground">Objectif d'utilisation de la capacité tonnage (ex. 85% = on accepte les tournées qui remplissent au moins 85% du véhicule).</p>
            </div>

            <div className="space-y-1.5">
              <Label>Commentaire</Label>
              <Textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} placeholder="Contraintes particulières, urgences, notes au planificateur…" />
            </div>

            <DialogFooter><Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog d'aide */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comprendre les plannings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="mb-1 font-semibold">Logique générale</h3>
              <p className="text-muted-foreground">
                Le planning est l'étape <strong>P2</strong> du cycle TMS. Il consolide toutes les demandes de transport
                à exécuter une journée donnée et choisit comment optimiser leur exécution. Une fois validé, il génère
                les <strong>mises à disposition (MAD)</strong> qui réservent les ressources (véhicules + chauffeurs).
              </p>
            </section>

            <section>
              <h3 className="mb-1 font-semibold">Champs du formulaire</h3>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li><strong className="text-foreground">Référence</strong> — générée automatiquement (PLAN-AAMMJJ-XXXX), sert d'identifiant unique.</li>
                <li><strong className="text-foreground">Date de planification</strong> — jour pour lequel on planifie. Permet aussi le filtrage historique.</li>
                <li><strong className="text-foreground">Algorithme</strong> — méthode utilisée pour répartir les tournées (voir section suivante).</li>
                <li><strong className="text-foreground">Taux de remplissage cible</strong> — KPI cible : pourcentage de capacité utilisée. Plus c'est haut, moins on a besoin de véhicules.</li>
                <li><strong className="text-foreground">Statut</strong> — brouillon (modifiable) → validé (gelé, déclenche les MAD).</li>
                <li><strong className="text-foreground">Commentaire</strong> — instructions libres pour le planificateur ou les opérateurs.</li>
              </ul>
            </section>

            <section>
              <h3 className="mb-1 font-semibold">Détail des algorithmes</h3>
              <div className="space-y-3">
                {ALGORITHMES.map((a) => (
                  <div key={a.value} className="rounded-md border border-border bg-card p-3">
                    <p className="font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-1 font-semibold">Cycle complet</h3>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Création du planning (brouillon)</li>
                <li>Choix de l'algorithme et paramétrage</li>
                <li>Validation → statut « validé »</li>
                <li>Création des MAD associées (manuelle ou auto)</li>
                <li>Affectation véhicules + chauffeurs (cohérence flotte)</li>
                <li>Génération des missions exécutables</li>
              </ol>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
