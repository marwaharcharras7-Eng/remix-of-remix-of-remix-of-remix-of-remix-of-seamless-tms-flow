import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Route as RouteIcon, Play, CheckCircle2, Receipt, Lock } from "lucide-react";
import { toast } from "sonner";
import { generateRef } from "@/lib/tms-types";

export default function Missions({ mineOnly = false }: { mineOnly?: boolean }) {
  const { hasRole, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("missions").select("*, vehicules(immatriculation), chauffeurs(nom, prenom, user_id)").order("created_at", { ascending: false });
    const { data } = await q;
    let filtered = data || [];
    if (mineOnly) filtered = filtered.filter((m: any) => m.chauffeurs?.user_id === user?.id);
    setItems(filtered); setLoading(false);
  };
  useEffect(() => { load(); }, [mineOnly, user]);

  const action = async (m: any, newStatut: string, extra: any = {}) => {
    const payload: any = { statut: newStatut, ...extra };
    if (newStatut === "en_cours") payload.date_debut_reelle = new Date().toISOString();
    if (newStatut === "livree") payload.date_fin_reelle = new Date().toISOString();
    const { error } = await supabase.from("missions").update(payload).eq("id", m.id);
    if (error) return toast.error(error.message);

    // Sync véhicule/chauffeur statut
    if (newStatut === "en_cours" && m.vehicule_id) await supabase.from("vehicules").update({ statut: "en_mission" }).eq("id", m.vehicule_id);
    if (newStatut === "livree" && m.vehicule_id) await supabase.from("vehicules").update({ statut: "disponible" }).eq("id", m.vehicule_id);
    if (newStatut === "livree" && m.chauffeur_id) await supabase.from("chauffeurs").update({ disponibilite: true }).eq("id", m.chauffeur_id);

    toast.success("Mission mise à jour"); load();
  };

  const facturer = async (m: any) => {
    if (!confirm(`Générer la facture pour ${m.reference} ?`)) return;
    const cout = Number(m.cout_reel) || Number(m.cout_estime) || 0;
    const tva = 20;
    const ttc = cout * (1 + tva / 100);
    const { error } = await supabase.from("factures").insert({
      numero: generateRef("FAC"),
      mission_id: m.id,
      montant_ht: cout, tva_taux: tva, montant_ttc: ttc,
      statut: "brouillon", client: m.destination, created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    await supabase.from("missions").update({ statut: "facturee" }).eq("id", m.id);
    toast.success("Facture générée");
    load();
  };

  const cloturer = async (m: any) => {
    await supabase.from("missions").update({ statut: "cloturee" }).eq("id", m.id);
    toast.success("Mission clôturée"); load();
  };

  const isChauffeurOf = (m: any) => m.chauffeurs?.user_id === user?.id;
  const canPlanif = hasRole("administrateur") || hasRole("planificateur");
  const canCompta = hasRole("administrateur") || hasRole("comptable");

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={mineOnly ? "Mes missions" : "Missions"} description={mineOnly ? "Vos missions assignées" : "P4 — Cycle exécution complet"} />
      <div className="flex-1 p-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead><tr className="border-b border-border">
                <th className="px-4 py-3 text-left">Réf.</th><th className="px-4 py-3 text-left">Trajet</th>
                <th className="px-4 py-3 text-left">Véhicule</th><th className="px-4 py-3 text-left">Chauffeur</th>
                <th className="px-4 py-3 text-left">Date prévue</th>
                <th className="px-4 py-3 text-right">Coût</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Chargement…</td></tr>
                : items.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-muted-foreground"><RouteIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucune mission</td></tr>
                : items.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono font-medium">{m.reference}</td>
                    <td className="px-4 py-3 text-xs">{m.origine} → {m.destination}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.vehicules?.immatriculation || "—"}</td>
                    <td className="px-4 py-3 text-xs">{m.chauffeurs ? `${m.chauffeurs.prenom} ${m.chauffeurs.nom}` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(m.date_debut_prevue).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs">{Number(m.cout_reel || m.cout_estime).toLocaleString("fr-FR")} MAD</td>
                    <td className="px-4 py-3"><StatusBadge status={m.statut} /></td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {(canPlanif || isChauffeurOf(m)) && m.statut === "affectee" && <Button size="sm" variant="outline" onClick={() => action(m, "en_cours")}><Play className="mr-1 h-3 w-3" />Démarrer</Button>}
                      {(canPlanif || isChauffeurOf(m)) && m.statut === "en_cours" && <Button size="sm" variant="outline" onClick={() => action(m, "livree")}><CheckCircle2 className="mr-1 h-3 w-3" />Livrer</Button>}
                      {canCompta && m.statut === "livree" && <Button size="sm" onClick={() => facturer(m)}><Receipt className="mr-1 h-3 w-3" />Facturer</Button>}
                      {canCompta && m.statut === "facturee" && <Button size="sm" variant="outline" onClick={() => cloturer(m)}><Lock className="mr-1 h-3 w-3" />Clôturer</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
