import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Truck, ShieldCheck, BarChart3, MapPin, Receipt, Workflow, Users } from "lucide-react";

const FEATURES = [
  { icon: Workflow, title: "7 processus BPM", desc: "P1 Ressources → P2 Planning → P3 MAD auto → P4 Exécution → P5 KPI → P6 Reporting → P7 Facturation" },
  { icon: ShieldCheck, title: "RBAC sécurisé", desc: "5 rôles métier (Admin, Planificateur, Chauffeur, Comptable, Direction) avec accès cloisonnés" },
  { icon: MapPin, title: "Suivi GPS temps réel", desc: "Position, vitesse, kilométrage. Alimentation directe des KPI de performance" },
  { icon: BarChart3, title: "KPI dynamiques", desc: "Tableaux de bord calculés en temps réel depuis la base : flotte, chauffeurs, missions, finance" },
  { icon: Receipt, title: "Facturation automatique", desc: "Génération auto à la clôture mission (km réels, poids, durée, prestation)" },
  { icon: Users, title: "Pont bascule intégré", desc: "Pesée chargement/livraison, contrôle qualité poids réels vs théoriques" },
];

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && user) navigate("/dashboard"); }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="container relative mx-auto px-6 py-20 md:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              <span className="text-xs font-medium">TMS — Transport Management System</span>
            </div>
            <h1 className="mb-5 text-4xl font-bold leading-tight md:text-6xl">
              Pilotez votre flotte<br />
              <span className="text-accent">de bout en bout</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-primary-foreground/85">
              Solution intégrée Web & Mobile pour planifier, suivre et contrôler vos opérations de transport.
              GPS, pont bascule, facturation automatique et KPI temps réel.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
                <Link to="/auth">Accéder à la plateforme</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/5 text-primary-foreground hover:bg-white/15">
                <a href="#features">Découvrir les modules</a>
              </Button>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <div><div className="text-3xl font-bold text-accent">7</div><div className="text-xs uppercase tracking-wider text-primary-foreground/70">Processus BPM</div></div>
              <div><div className="text-3xl font-bold text-accent">5</div><div className="text-xs uppercase tracking-wider text-primary-foreground/70">Rôles métier</div></div>
              <div><div className="text-3xl font-bold text-accent">100%</div><div className="text-xs uppercase tracking-wider text-primary-foreground/70">Synchronisé</div></div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold md:text-4xl">Modules fonctionnels</h2>
          <p className="text-muted-foreground">Tout le cycle de vie du transport, du planning à la facturation</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-xl border border-border bg-card p-6 transition-base hover:border-accent/40 hover:shadow-md-soft">
              <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3 text-accent transition-base group-hover:scale-110">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          TMS — Cahier des charges Génie Industriel · M. Abdelmajid Elouadi
        </div>
      </footer>
    </div>
  );
}
