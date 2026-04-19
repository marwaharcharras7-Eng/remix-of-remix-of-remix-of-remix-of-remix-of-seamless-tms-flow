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
import { Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Incidents() {
  const { hasRole, user } = useAuth();
  const canResolve = hasRole("administrateur") || hasRole("planificateur");
  const [items, setItems] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mission_id: "", type_incident: "Retard", description: "", gravite: "mineur" });

  const load = async () => {
    const [{ data: i }, { data: m }] = await Promise.all([
      supabase.from("incidents").select("*, missions(reference)").order("created_at", { ascending: false }),
      supabase.from("missions").select("id, reference"),
    ]);
    setItems(i || []); setMissions(m || []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("incidents").insert({
      mission_id: form.mission_id,
      type_incident: form.type_incident,
      description: form.description,
      gravite: form.gravite as "mineur"|"majeur"|"critique",
      declare_par: user?.id,
    });
    if (error) return toast.error(error.message);
    if (form.gravite === "majeur" || form.gravite === "critique") await supabase.from("missions").update({ litige: true }).eq("id", form.mission_id);
    toast.success("Incident déclaré"); setOpen(false);
    setForm({ mission_id: "", type_incident: "Retard", description: "", gravite: "mineur" });
    load();
  };

  const resoudre = async (i: any) => {
    await supabase.from("incidents").update({ resolu: true }).eq("id", i.id);
    toast.success("Résolu"); load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Incidents" description="Litiges et anomalies terrain"
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Déclarer incident</Button>} />
      <div className="flex-1 p-6">
        <Card>
          <table className="w-full text-sm data-table">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Mission</th>
              <th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Gravité</th><th className="px-4 py-3 text-center">Résolu</th>
              {canResolve && <th className="px-4 py-3 text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground"><AlertTriangle className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucun incident</td></tr>
              : items.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(i.date_incident).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{i.missions?.reference}</td>
                  <td className="px-4 py-3">{i.type_incident}</td>
                  <td className="px-4 py-3 text-xs max-w-md">{i.description}</td>
                  <td className="px-4 py-3"><StatusBadge status={i.gravite} /></td>
                  <td className="px-4 py-3 text-center">{i.resolu ? <CheckCircle2 className="mx-auto h-4 w-4 text-success" /> : "—"}</td>
                  {canResolve && <td className="px-4 py-3 text-right">{!i.resolu && <Button size="sm" variant="outline" onClick={() => resoudre(i)}>Résoudre</Button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Déclarer un incident</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5"><Label>Mission *</Label>
              <Select value={form.mission_id} onValueChange={(v) => setForm({ ...form, mission_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{missions.map((m) => <SelectItem key={m.id} value={m.id}>{m.reference}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label><Input value={form.type_incident} onChange={(e) => setForm({ ...form, type_incident: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Gravité</Label>
                <Select value={form.gravite} onValueChange={(v) => setForm({ ...form, gravite: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="mineur">Mineur</SelectItem><SelectItem value="majeur">Majeur</SelectItem><SelectItem value="critique">Critique</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Description *</Label><Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <DialogFooter><Button type="submit" disabled={!form.mission_id}>Déclarer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
