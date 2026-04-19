import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Receipt, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

export default function Factures() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("administrateur") || hasRole("comptable");
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("factures").select("*, missions(reference, destination)").order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const setStatut = async (f: any, s: "brouillon"|"validee"|"envoyee"|"payee"|"annulee") => {
    await supabase.from("factures").update({ statut: s }).eq("id", f.id);
    toast.success("Statut mis à jour"); load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Factures" description="P7 — Facturation & clôture financière" />
      <div className="flex-1 p-6">
        <Card>
          <table className="w-full text-sm data-table">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left">N° Facture</th><th className="px-4 py-3 text-left">Mission</th>
              <th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">Émission</th>
              <th className="px-4 py-3 text-right">Montant HT</th><th className="px-4 py-3 text-right">TVA</th>
              <th className="px-4 py-3 text-right">TTC</th><th className="px-4 py-3 text-left">Statut</th>
              {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={9} className="py-12 text-center text-muted-foreground"><Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucune facture (générées depuis Missions livrées)</td></tr>
              : items.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono font-medium">{f.numero}</td>
                  <td className="px-4 py-3 font-mono text-xs">{f.missions?.reference}</td>
                  <td className="px-4 py-3">{f.client || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(f.date_emission).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(f.montant_ht).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{Number(f.tva_taux)}%</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{Number(f.montant_ttc).toLocaleString("fr-FR")} MAD</td>
                  <td className="px-4 py-3"><StatusBadge status={f.statut} /></td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right space-x-1">
                      {f.statut === "brouillon" && <Button size="sm" variant="outline" onClick={() => setStatut(f, "validee")}><CheckCircle2 className="mr-1 h-3 w-3" />Valider</Button>}
                      {f.statut === "validee" && <Button size="sm" variant="outline" onClick={() => setStatut(f, "envoyee")}><Send className="mr-1 h-3 w-3" />Envoyer</Button>}
                      {f.statut === "envoyee" && <Button size="sm" onClick={() => setStatut(f, "payee")}>Marquer payée</Button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
