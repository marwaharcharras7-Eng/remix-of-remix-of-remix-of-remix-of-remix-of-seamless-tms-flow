import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Truck, Loader2 } from "lucide-react";
import { AppRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/tms-types";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [role, setRole] = useState<AppRole>("chauffeur");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Connexion réussie");
        navigate("/dashboard");
      } else {
        if (password.length < 8) { toast.error("Mot de passe : min 8 caractères"); return; }
        const { error } = await signUp(email, password, nom, prenom, role);
        if (error) throw error;
        toast.success("Compte créé ! Vous pouvez vous connecter.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-users");
      if (error) throw error;
      toast.success(`${data?.users?.length ?? 0} comptes de démo prêts !`);
    } catch (err: any) {
      toast.error(err.message || "Erreur de seed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-6">
      <Card className="w-full max-w-md p-8 shadow-lg-soft">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-glow">
            <Truck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Transport Management System</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Connexion à votre espace" : "Créer un compte"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            {mode === "signup" && <p className="text-xs text-muted-foreground">Min 8 caractères</p>}
          </div>

          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="role">Rôle métier</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "signin" ? (
            <button onClick={() => setMode("signup")} className="text-primary hover:underline">
              Pas de compte ? S'inscrire
            </button>
          ) : (
            <button onClick={() => setMode("signin")} className="text-primary hover:underline">
              Déjà un compte ? Se connecter
            </button>
          )}
        </div>

        <div className="mt-6 rounded-md border border-border bg-muted/40 p-3 text-xs">
          <p className="mb-2 font-semibold text-foreground">🧪 Comptes de démo (mot de passe : <code className="rounded bg-background px-1 py-0.5">Demo1234!</code>)</p>
          <ul className="space-y-0.5 text-muted-foreground">
            <li><code>admin@tms.demo</code> — Administrateur</li>
            <li><code>planif@tms.demo</code> — Planificateur</li>
            <li><code>chauffeur@tms.demo</code> — Chauffeur</li>
            <li><code>compta@tms.demo</code> — Comptable</li>
            <li><code>direction@tms.demo</code> — Direction</li>
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">Si un compte n'existe pas encore, créez-le via "S'inscrire" en sélectionnant le rôle correspondant.</p>
          <Button onClick={seedDemo} disabled={seeding} variant="secondary" size="sm" className="mt-3 w-full">
            {seeding && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Créer les 5 comptes de démo
          </Button>
        </div>
      </Card>
    </div>
  );
}
