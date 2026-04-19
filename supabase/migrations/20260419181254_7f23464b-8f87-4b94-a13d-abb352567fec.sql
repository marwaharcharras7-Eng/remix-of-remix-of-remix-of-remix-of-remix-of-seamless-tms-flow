
-- ============================================
-- 1. ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('administrateur', 'planificateur', 'chauffeur', 'comptable', 'direction');
CREATE TYPE public.vehicule_statut AS ENUM ('disponible', 'affecte', 'en_mission', 'maintenance', 'retire');
CREATE TYPE public.mission_statut AS ENUM ('creee', 'affectee', 'en_cours', 'livree', 'facturee', 'cloturee', 'annulee');
CREATE TYPE public.mad_statut AS ENUM ('creee', 'validee', 'affectee', 'en_cours', 'terminee', 'annulee');
CREATE TYPE public.type_prestation AS ENUM ('interne', 'externe');
CREATE TYPE public.facture_statut AS ENUM ('brouillon', 'validee', 'envoyee', 'payee', 'annulee');
CREATE TYPE public.incident_gravite AS ENUM ('mineur', 'majeur', 'critique');

-- ============================================
-- 2. PROFILES (lien auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL DEFAULT '',
  prenom TEXT NOT NULL DEFAULT '',
  telephone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. USER_ROLES (RBAC)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function (anti-recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- ============================================
-- 4. updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 5. Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nom, prenom, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    NEW.email
  );
  -- Default role: chauffeur (admin doit ré-assigner)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'chauffeur'::app_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. FLOTTES
-- ============================================
CREATE TABLE public.flottes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type_transport TEXT NOT NULL,
  responsable TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flottes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_flottes_updated BEFORE UPDATE ON public.flottes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. VEHICULES
-- ============================================
CREATE TABLE public.vehicules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation TEXT NOT NULL UNIQUE,
  type_vehicule TEXT NOT NULL,
  capacite_tonnage NUMERIC(10,2) NOT NULL DEFAULT 0,
  capacite_volume NUMERIC(10,2) NOT NULL DEFAULT 0,
  statut vehicule_statut NOT NULL DEFAULT 'disponible',
  flotte_id UUID REFERENCES public.flottes(id) ON DELETE SET NULL,
  km_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  consommation_moyenne NUMERIC(6,2) NOT NULL DEFAULT 0,
  derniere_maintenance DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_vehicules_updated BEFORE UPDATE ON public.vehicules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. CHAUFFEURS
-- ============================================
CREATE TABLE public.chauffeurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  numero_permis TEXT NOT NULL,
  type_permis TEXT NOT NULL DEFAULT 'C',
  telephone TEXT,
  disponibilite BOOLEAN NOT NULL DEFAULT true,
  taux_performance NUMERIC(5,2) NOT NULL DEFAULT 100,
  consommation_moyenne NUMERIC(6,2) NOT NULL DEFAULT 0,
  km_parcourus_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  flotte_id UUID REFERENCES public.flottes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chauffeurs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_chauffeurs_updated BEFORE UPDATE ON public.chauffeurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 9. PRESTATAIRES
-- ============================================
CREATE TABLE public.prestataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  contact TEXT,
  telephone TEXT,
  email TEXT,
  contrat_reference TEXT,
  cout_horaire NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prestataires ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_prestataires_updated BEFORE UPDATE ON public.prestataires FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 10. PLANIFICATIONS
-- ============================================
CREATE TABLE public.planifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  date_planification DATE NOT NULL,
  algorithme_utilise TEXT DEFAULT 'manuel',
  taux_remplissage NUMERIC(5,2) DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  commentaire TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planifications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_planifications_updated BEFORE UPDATE ON public.planifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 11. MISES A DISPOSITION
-- ============================================
CREATE TABLE public.mises_a_disposition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  planification_id UUID REFERENCES public.planifications(id) ON DELETE CASCADE,
  type_prestation type_prestation NOT NULL DEFAULT 'interne',
  prestataire_id UUID REFERENCES public.prestataires(id),
  date_debut_prevue TIMESTAMPTZ NOT NULL,
  date_fin_prevue TIMESTAMPTZ NOT NULL,
  type_vehicule_requis TEXT NOT NULL,
  nb_vehicules INTEGER NOT NULL DEFAULT 1,
  region_destination TEXT NOT NULL,
  cout_estime NUMERIC(12,2) NOT NULL DEFAULT 0,
  commentaire TEXT,
  statut mad_statut NOT NULL DEFAULT 'creee',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mises_a_disposition ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_mad_updated BEFORE UPDATE ON public.mises_a_disposition FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 12. MISSIONS
-- ============================================
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  mise_a_disposition_id UUID REFERENCES public.mises_a_disposition(id) ON DELETE SET NULL,
  vehicule_id UUID REFERENCES public.vehicules(id),
  chauffeur_id UUID REFERENCES public.chauffeurs(id),
  prestataire_id UUID REFERENCES public.prestataires(id),
  type_prestation type_prestation NOT NULL DEFAULT 'interne',
  origine TEXT NOT NULL,
  destination TEXT NOT NULL,
  date_debut_prevue TIMESTAMPTZ NOT NULL,
  date_fin_prevue TIMESTAMPTZ NOT NULL,
  date_debut_reelle TIMESTAMPTZ,
  date_fin_reelle TIMESTAMPTZ,
  km_prevus NUMERIC(10,2) DEFAULT 0,
  km_reels NUMERIC(10,2) DEFAULT 0,
  poids_charge NUMERIC(10,2) DEFAULT 0,
  poids_livre NUMERIC(10,2) DEFAULT 0,
  cout_estime NUMERIC(12,2) DEFAULT 0,
  cout_reel NUMERIC(12,2) DEFAULT 0,
  consommation_gasoil NUMERIC(10,2) DEFAULT 0,
  temps_attente_min INTEGER DEFAULT 0,
  statut mission_statut NOT NULL DEFAULT 'creee',
  litige BOOLEAN NOT NULL DEFAULT false,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_missions_updated BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_missions_chauffeur ON public.missions(chauffeur_id);
CREATE INDEX idx_missions_vehicule ON public.missions(vehicule_id);
CREATE INDEX idx_missions_statut ON public.missions(statut);

-- ============================================
-- 13. GPS POSITIONS
-- ============================================
CREATE TABLE public.gps_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  vehicule_id UUID REFERENCES public.vehicules(id),
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  vitesse NUMERIC(6,2) DEFAULT 0,
  date_heure TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gps_positions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gps_mission ON public.gps_positions(mission_id, date_heure DESC);

-- ============================================
-- 14. PESEES PONT BASCULE
-- ============================================
CREATE TABLE public.pesees_pont_bascule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  vehicule_id UUID REFERENCES public.vehicules(id),
  type_pesee TEXT NOT NULL DEFAULT 'chargement', -- chargement | livraison
  poids_mesure NUMERIC(10,2) NOT NULL,
  poids_theorique NUMERIC(10,2),
  ecart NUMERIC(10,2) GENERATED ALWAYS AS (poids_mesure - COALESCE(poids_theorique, 0)) STORED,
  validation_tonnage BOOLEAN NOT NULL DEFAULT true,
  date_mesure TIMESTAMPTZ NOT NULL DEFAULT now(),
  operateur UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pesees_pont_bascule ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 15. FACTURES
-- ============================================
CREATE TABLE public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE,
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_taux NUMERIC(5,2) NOT NULL DEFAULT 20,
  montant_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut facture_statut NOT NULL DEFAULT 'brouillon',
  client TEXT,
  commentaire TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_factures_updated BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 16. INCIDENTS
-- ============================================
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  type_incident TEXT NOT NULL,
  description TEXT NOT NULL,
  gravite incident_gravite NOT NULL DEFAULT 'mineur',
  resolu BOOLEAN NOT NULL DEFAULT false,
  declare_par UUID REFERENCES auth.users(id),
  date_incident TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- PROFILES : chacun voit le sien, admin/direction voient tout
CREATE POLICY "users_view_own_profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'direction'));
CREATE POLICY "users_update_own_profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admin_insert_profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "admin_delete_profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'administrateur'));

-- USER_ROLES : seul admin gère
CREATE POLICY "users_view_own_roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "admin_manage_roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'administrateur')) WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

-- FLOTTES : admin write, planificateur+direction read
CREATE POLICY "flottes_select" ON public.flottes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "flottes_admin_write" ON public.flottes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "flottes_admin_update" ON public.flottes FOR UPDATE USING (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "flottes_admin_delete" ON public.flottes FOR DELETE USING (public.has_role(auth.uid(), 'administrateur'));

-- VEHICULES : tous lisent (sauf chauffeur restreint à voir tout pour mission), admin+planificateur écrivent
CREATE POLICY "vehicules_select" ON public.vehicules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "vehicules_write_admin_planif" ON public.vehicules FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "vehicules_update_admin_planif" ON public.vehicules FOR UPDATE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "vehicules_delete_admin" ON public.vehicules FOR DELETE USING (public.has_role(auth.uid(), 'administrateur'));

-- CHAUFFEURS
CREATE POLICY "chauffeurs_select" ON public.chauffeurs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "chauffeurs_write_admin_planif" ON public.chauffeurs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "chauffeurs_update" ON public.chauffeurs FOR UPDATE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur') OR auth.uid() = user_id);
CREATE POLICY "chauffeurs_delete_admin" ON public.chauffeurs FOR DELETE USING (public.has_role(auth.uid(), 'administrateur'));

-- PRESTATAIRES
CREATE POLICY "prestataires_select" ON public.prestataires FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "prestataires_write" ON public.prestataires FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "prestataires_update" ON public.prestataires FOR UPDATE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "prestataires_delete" ON public.prestataires FOR DELETE USING (public.has_role(auth.uid(), 'administrateur'));

-- PLANIFICATIONS : planificateur + admin
CREATE POLICY "planif_select" ON public.planifications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "planif_write" ON public.planifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "planif_update" ON public.planifications FOR UPDATE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "planif_delete" ON public.planifications FOR DELETE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));

-- MISES A DISPOSITION
CREATE POLICY "mad_select" ON public.mises_a_disposition FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mad_write" ON public.mises_a_disposition FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "mad_update" ON public.mises_a_disposition FOR UPDATE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "mad_delete" ON public.mises_a_disposition FOR DELETE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));

-- MISSIONS : chauffeur ne voit que les siennes
CREATE POLICY "missions_select" ON public.missions FOR SELECT USING (
  public.has_role(auth.uid(), 'administrateur')
  OR public.has_role(auth.uid(), 'planificateur')
  OR public.has_role(auth.uid(), 'direction')
  OR public.has_role(auth.uid(), 'comptable')
  OR (public.has_role(auth.uid(), 'chauffeur') AND chauffeur_id IN (SELECT id FROM public.chauffeurs WHERE user_id = auth.uid()))
);
CREATE POLICY "missions_write_admin_planif" ON public.missions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));
CREATE POLICY "missions_update" ON public.missions FOR UPDATE USING (
  public.has_role(auth.uid(), 'administrateur')
  OR public.has_role(auth.uid(), 'planificateur')
  OR (public.has_role(auth.uid(), 'chauffeur') AND chauffeur_id IN (SELECT id FROM public.chauffeurs WHERE user_id = auth.uid()))
);
CREATE POLICY "missions_delete_admin" ON public.missions FOR DELETE USING (public.has_role(auth.uid(), 'administrateur'));

-- GPS : chauffeur peut insérer sur ses missions
CREATE POLICY "gps_select" ON public.gps_positions FOR SELECT USING (
  public.has_role(auth.uid(), 'administrateur')
  OR public.has_role(auth.uid(), 'planificateur')
  OR public.has_role(auth.uid(), 'direction')
  OR (public.has_role(auth.uid(), 'chauffeur') AND mission_id IN (SELECT id FROM public.missions WHERE chauffeur_id IN (SELECT id FROM public.chauffeurs WHERE user_id = auth.uid())))
);
CREATE POLICY "gps_insert" ON public.gps_positions FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'administrateur')
  OR public.has_role(auth.uid(), 'planificateur')
  OR (public.has_role(auth.uid(), 'chauffeur') AND mission_id IN (SELECT id FROM public.missions WHERE chauffeur_id IN (SELECT id FROM public.chauffeurs WHERE user_id = auth.uid())))
);

-- PESEES
CREATE POLICY "pesees_select" ON public.pesees_pont_bascule FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pesees_insert" ON public.pesees_pont_bascule FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'administrateur')
  OR public.has_role(auth.uid(), 'planificateur')
  OR public.has_role(auth.uid(), 'chauffeur')
);
CREATE POLICY "pesees_update_admin" ON public.pesees_pont_bascule FOR UPDATE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));

-- FACTURES : comptable + admin
CREATE POLICY "factures_select" ON public.factures FOR SELECT USING (
  public.has_role(auth.uid(), 'administrateur')
  OR public.has_role(auth.uid(), 'comptable')
  OR public.has_role(auth.uid(), 'direction')
);
CREATE POLICY "factures_write_compta" ON public.factures FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'comptable'));
CREATE POLICY "factures_update_compta" ON public.factures FOR UPDATE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'comptable'));
CREATE POLICY "factures_delete_admin" ON public.factures FOR DELETE USING (public.has_role(auth.uid(), 'administrateur'));

-- INCIDENTS
CREATE POLICY "incidents_select" ON public.incidents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "incidents_insert" ON public.incidents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "incidents_update" ON public.incidents FOR UPDATE USING (public.has_role(auth.uid(), 'administrateur') OR public.has_role(auth.uid(), 'planificateur'));

-- ============================================
-- 17. KPI VIEW (lecture rapide)
-- ============================================
CREATE OR REPLACE VIEW public.v_kpi_global
WITH (security_invoker=on) AS
SELECT
  (SELECT COUNT(*) FROM public.vehicules) AS nb_vehicules_total,
  (SELECT COUNT(*) FROM public.vehicules WHERE statut = 'disponible') AS nb_vehicules_dispo,
  (SELECT COUNT(*) FROM public.vehicules WHERE statut = 'en_mission') AS nb_vehicules_en_mission,
  (SELECT COUNT(*) FROM public.chauffeurs) AS nb_chauffeurs_total,
  (SELECT COUNT(*) FROM public.chauffeurs WHERE disponibilite = true) AS nb_chauffeurs_dispo,
  (SELECT COUNT(*) FROM public.missions WHERE statut IN ('en_cours','affectee')) AS nb_missions_actives,
  (SELECT COUNT(*) FROM public.missions WHERE statut = 'cloturee') AS nb_missions_cloturees,
  (SELECT COUNT(*) FROM public.missions WHERE litige = true) AS nb_litiges,
  (SELECT COALESCE(SUM(km_reels),0) FROM public.missions WHERE statut IN ('livree','facturee','cloturee')) AS km_total_parcourus,
  (SELECT COALESCE(SUM(consommation_gasoil),0) FROM public.missions) AS consommation_totale,
  (SELECT COALESCE(SUM(montant_ttc),0) FROM public.factures WHERE statut IN ('validee','envoyee','payee')) AS ca_total,
  (SELECT COUNT(*) FROM public.mises_a_disposition WHERE statut = 'creee') AS nb_mad_en_attente;
