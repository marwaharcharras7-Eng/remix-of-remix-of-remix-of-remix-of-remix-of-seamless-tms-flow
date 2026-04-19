import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Receipt, CheckCircle2, Send, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function Factures() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("administrateur") || hasRole("comptable");
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("factures").select("*, missions(reference, destination, origine)").order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const setStatut = async (f: any, s: "brouillon"|"validee"|"envoyee"|"payee"|"annulee") => {
    const { error } = await supabase.from("factures").update({ statut: s }).eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success(`✅ Facture ${f.numero} → statut ${s}`); load();
  };

  const exporterFacture = (f: any) => {
    try {
      const doc = new jsPDF();
      const orange = "#E67E22";

      // En-tête
      doc.setFillColor(orange);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22).setFont("helvetica", "bold");
      doc.text("FACTURE", 14, 20);
      doc.setFontSize(10).setFont("helvetica", "normal");
      doc.text(`N° ${f.numero}`, 196, 20, { align: "right" });

      // Corps
      doc.setTextColor(0, 0, 0);
      let y = 45;
      doc.setFontSize(11).setFont("helvetica", "bold");
      doc.text("Émetteur", 14, y);
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text("TMS Maroc — Transport & Logistique", 14, y + 6);
      doc.text("Casablanca, Maroc", 14, y + 12);

      doc.setFont("helvetica", "bold").setFontSize(11);
      doc.text("Client", 120, y);
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text(f.client || "—", 120, y + 6);

      y += 28;
      doc.setDrawColor(220);
      doc.line(14, y, 196, y);

      y += 8;
      doc.setFontSize(10);
      doc.text(`Date d'émission : ${new Date(f.date_emission).toLocaleDateString("fr-FR")}`, 14, y);
      if (f.date_echeance) doc.text(`Date d'échéance : ${new Date(f.date_echeance).toLocaleDateString("fr-FR")}`, 14, y + 6);
      doc.text(`Statut : ${f.statut.toUpperCase()}`, 196, y, { align: "right" });

      // Tableau prestation
      y += 18;
      doc.setFillColor(245, 245, 245);
      doc.rect(14, y, 182, 8, "F");
      doc.setFont("helvetica", "bold").setFontSize(10);
      doc.text("Désignation", 18, y + 5);
      doc.text("Montant HT", 192, y + 5, { align: "right" });

      y += 14;
      doc.setFont("helvetica", "normal");
      const designation = f.missions
        ? `Mission ${f.missions.reference} : ${f.missions.origine || ""} → ${f.missions.destination || ""}`
        : "Prestation transport";
      doc.text(designation, 18, y);
      doc.text(`${Number(f.montant_ht).toLocaleString("fr-FR")} MAD`, 192, y, { align: "right" });

      // Totaux
      y += 20;
      doc.line(120, y, 196, y);
      y += 6;
      doc.text("Total HT", 120, y);
      doc.text(`${Number(f.montant_ht).toLocaleString("fr-FR")} MAD`, 192, y, { align: "right" });
      y += 6;
      doc.text(`TVA (${Number(f.tva_taux)}%)`, 120, y);
      const tvaMontant = Number(f.montant_ht) * Number(f.tva_taux) / 100;
      doc.text(`${tvaMontant.toLocaleString("fr-FR")} MAD`, 192, y, { align: "right" });
      y += 8;
      doc.setFont("helvetica", "bold").setFontSize(12);
      doc.setTextColor(orange);
      doc.text("Total TTC", 120, y);
      doc.text(`${Number(f.montant_ttc).toLocaleString("fr-FR")} MAD`, 192, y, { align: "right" });

      // Pied de page
      doc.setTextColor(120);
      doc.setFontSize(8).setFont("helvetica", "normal");
      doc.text("Document généré automatiquement par TMS Maroc — Confidentiel", 105, 285, { align: "center" });

      doc.save(`Facture-${f.numero}.pdf`);
      toast.success(`✅ Facture ${f.numero} exportée en PDF`);
    } catch (err: any) {
      toast.error(`Erreur export : ${err.message}`);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Factures" description="P7 — Facturation & clôture financière" />
      <div className="flex-1 p-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead><tr className="border-b border-border">
                <th className="px-4 py-3 text-left">N° Facture</th><th className="px-4 py-3 text-left">Mission</th>
                <th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">Émission</th>
                <th className="px-4 py-3 text-right">Montant HT</th><th className="px-4 py-3 text-right">TVA</th>
                <th className="px-4 py-3 text-right">TTC</th><th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
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
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => exporterFacture(f)}>
                        <Download className="mr-1 h-3 w-3" />Exporter
                      </Button>
                      {canEdit && f.statut === "brouillon" && <Button size="sm" variant="outline" onClick={() => setStatut(f, "validee")}><CheckCircle2 className="mr-1 h-3 w-3" />Valider</Button>}
                      {canEdit && f.statut === "validee" && <Button size="sm" variant="outline" onClick={() => setStatut(f, "envoyee")}><Send className="mr-1 h-3 w-3" />Envoyer</Button>}
                      {canEdit && f.statut === "envoyee" && <Button size="sm" onClick={() => setStatut(f, "payee")}>Marquer payée</Button>}
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
