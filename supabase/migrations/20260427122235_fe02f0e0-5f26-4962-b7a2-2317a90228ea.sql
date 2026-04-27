-- ========================================
-- 1) Drop toutes les policies dépendant de has_role(uuid, app_role)
-- ========================================
DROP POLICY IF EXISTS admin_delete_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_insert_profiles ON public.profiles;
DROP POLICY IF EXISTS users_view_own_profile ON public.profiles;
DROP POLICY IF EXISTS admin_manage_roles ON public.user_roles;
DROP POLICY IF EXISTS users_view_own_roles ON public.user_roles;
DROP POLICY IF EXISTS chauffeurs_delete_admin ON public.chauffeurs;
DROP POLICY IF EXISTS chauffeurs_update ON public.chauffeurs;
DROP POLICY IF EXISTS chauffeurs_write_admin_planif ON public.chauffeurs;
DROP POLICY IF EXISTS chauffeurs_select ON public.chauffeurs;
DROP POLICY IF EXISTS factures_delete_admin ON public.factures;
DROP POLICY IF EXISTS factures_select ON public.factures;
DROP POLICY IF EXISTS factures_update_compta ON public.factures;
DROP POLICY IF EXISTS factures_write_compta ON public.factures;
DROP POLICY IF EXISTS flottes_admin_delete ON public.flottes;
DROP POLICY IF EXISTS flottes_admin_update ON public.flottes;
DROP POLICY IF EXISTS flottes_admin_write ON public.flottes;
DROP POLICY IF EXISTS flottes_select ON public.flottes;
DROP POLICY IF EXISTS gps_insert ON public.gps_positions;
DROP POLICY IF EXISTS gps_select ON public.gps_positions;
DROP POLICY IF EXISTS incidents_update ON public.incidents;
DROP POLICY IF EXISTS incidents_select ON public.incidents;
DROP POLICY IF EXISTS incidents_insert ON public.incidents;
DROP POLICY IF EXISTS mad_delete ON public.mises_a_disposition;
DROP POLICY IF EXISTS mad_update ON public.mises_a_disposition;
DROP POLICY IF EXISTS mad_write ON public.mises_a_disposition;
DROP POLICY IF EXISTS mad_select ON public.mises_a_disposition;
DROP POLICY IF EXISTS missions_delete_admin ON public.missions;
DROP POLICY IF EXISTS missions_select ON public.missions;
DROP POLICY IF EXISTS missions_update ON public.missions;
DROP POLICY IF EXISTS missions_write_admin_planif ON public.missions;
DROP POLICY IF EXISTS pesees_insert ON public.pesees_pont_bascule;
DROP POLICY IF EXISTS pesees_update_admin ON public.pesees_pont_bascule;
DROP POLICY IF EXISTS pesees_select ON public.pesees_pont_bascule;
DROP POLICY IF EXISTS planif_delete ON public.planifications;
DROP POLICY IF EXISTS planif_update ON public.planifications;
DROP POLICY IF EXISTS planif_write ON public.planifications;
DROP POLICY IF EXISTS planif_select ON public.planifications;
DROP POLICY IF EXISTS prestataires_delete ON public.prestataires;
DROP POLICY IF EXISTS prestataires_update ON public.prestataires;
DROP POLICY IF EXISTS prestataires_write ON public.prestataires;
DROP POLICY IF EXISTS prestataires_select ON public.prestataires;
DROP POLICY IF EXISTS vehicules_delete_admin ON public.vehicules;
DROP POLICY IF EXISTS vehicules_update_admin_planif ON public.vehicules;
DROP POLICY IF EXISTS vehicules_write_admin_planif ON public.vehicules;
DROP POLICY IF EXISTS vehicules_select ON public.vehicules;

-- 2) Drop fonctions qui dépendent du type
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(uuid) CASCADE;

-- 3) Renommer ancien enum, créer le nouveau
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM (
  'admin_it', 'plant_manager', 'manager_logistique',
  'responsable_flotte', 'planificateur', 'chauffeur'
);

-- 4) Migrer la colonne user_roles.role
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING (
    CASE role::text
      WHEN 'administrateur' THEN 'plant_manager'
      WHEN 'direction'      THEN 'manager_logistique'
      WHEN 'comptable'      THEN 'manager_logistique'
      WHEN 'planificateur'  THEN 'planificateur'
      WHEN 'chauffeur'      THEN 'chauffeur'
      ELSE 'chauffeur'
    END
  )::public.app_role;

-- 5) Drop ancien enum
DROP TYPE public.app_role_old;

-- 6) Recréer fonctions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role public.app_role; v_role_text text;
BEGIN
  INSERT INTO public.profiles (user_id, nom, prenom, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nom',''), COALESCE(NEW.raw_user_meta_data->>'prenom',''), NEW.email)
  ON CONFLICT DO NOTHING;
  v_role_text := COALESCE(NEW.raw_user_meta_data->>'role','chauffeur');
  BEGIN v_role := v_role_text::public.app_role;
  EXCEPTION WHEN others THEN v_role := 'chauffeur'::public.app_role; END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- 7) Table de liaison responsable_flotte ↔ flottes
CREATE TABLE IF NOT EXISTS public.responsable_flotte_flottes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flotte_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, flotte_id)
);
ALTER TABLE public.responsable_flotte_flottes ENABLE ROW LEVEL SECURITY;
CREATE POLICY rff_select_authenticated ON public.responsable_flotte_flottes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY rff_manage_admins ON public.responsable_flotte_flottes FOR ALL
  USING (public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'))
  WITH CHECK (public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));

CREATE OR REPLACE FUNCTION public.user_flotte_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT flotte_id FROM public.responsable_flotte_flottes WHERE user_id = _user_id $$;

-- 8) Recréer toutes les policies

-- USER_ROLES
CREATE POLICY users_view_own_roles ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY admin_manage_roles ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'))
  WITH CHECK (public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));

-- PROFILES
CREATE POLICY users_view_profile ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY profiles_insert_admins ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY profiles_delete_admins ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));

-- FLOTTES
CREATE POLICY flottes_select ON public.flottes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY flottes_delete ON public.flottes FOR DELETE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY flottes_update ON public.flottes FOR UPDATE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY flottes_insert ON public.flottes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));

-- VEHICULES
CREATE POLICY vehicules_select ON public.vehicules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY vehicules_delete ON public.vehicules FOR DELETE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY vehicules_update ON public.vehicules FOR UPDATE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur')
    OR (public.has_role(auth.uid(),'responsable_flotte') AND flotte_id IN (SELECT public.user_flotte_ids(auth.uid()))));
CREATE POLICY vehicules_insert ON public.vehicules FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));

-- CHAUFFEURS (plant_manager NE PEUT PAS éditer)
CREATE POLICY chauffeurs_select ON public.chauffeurs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY chauffeurs_delete ON public.chauffeurs FOR DELETE
  USING (public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY chauffeurs_update ON public.chauffeurs FOR UPDATE
  USING (public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur')
    OR (public.has_role(auth.uid(),'responsable_flotte') AND flotte_id IN (SELECT public.user_flotte_ids(auth.uid())))
    OR (auth.uid() = user_id));
CREATE POLICY chauffeurs_insert ON public.chauffeurs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));

-- PRESTATAIRES
CREATE POLICY prestataires_select ON public.prestataires FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY prestataires_delete ON public.prestataires FOR DELETE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY prestataires_update ON public.prestataires FOR UPDATE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));
CREATE POLICY prestataires_insert ON public.prestataires FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));

-- PLANIFICATIONS (plant_manager NE PEUT PAS éditer)
CREATE POLICY planif_select ON public.planifications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY planif_delete ON public.planifications FOR DELETE
  USING (public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));
CREATE POLICY planif_update ON public.planifications FOR UPDATE
  USING (public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));
CREATE POLICY planif_insert ON public.planifications FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));

-- MAD
CREATE POLICY mad_select ON public.mises_a_disposition FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY mad_delete ON public.mises_a_disposition FOR DELETE
  USING (public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));
CREATE POLICY mad_update ON public.mises_a_disposition FOR UPDATE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));
CREATE POLICY mad_insert ON public.mises_a_disposition FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));

-- MISSIONS
CREATE POLICY missions_select ON public.missions FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager')
    OR public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur')
    OR (public.has_role(auth.uid(),'responsable_flotte') AND vehicule_id IN (
      SELECT id FROM public.vehicules WHERE flotte_id IN (SELECT public.user_flotte_ids(auth.uid()))))
    OR (public.has_role(auth.uid(),'chauffeur') AND chauffeur_id IN (
      SELECT id FROM public.chauffeurs WHERE user_id = auth.uid())));
CREATE POLICY missions_delete ON public.missions FOR DELETE
  USING (public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));
CREATE POLICY missions_update ON public.missions FOR UPDATE
  USING (public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur')
    OR (public.has_role(auth.uid(),'chauffeur') AND chauffeur_id IN (
      SELECT id FROM public.chauffeurs WHERE user_id = auth.uid())));
CREATE POLICY missions_insert ON public.missions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));

-- FACTURES
CREATE POLICY factures_select ON public.factures FOR SELECT
  USING (public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY factures_delete ON public.factures FOR DELETE
  USING (public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY factures_update ON public.factures FOR UPDATE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));
CREATE POLICY factures_insert ON public.factures FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique'));

-- INCIDENTS
CREATE POLICY incidents_select ON public.incidents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY incidents_insert ON public.incidents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY incidents_update ON public.incidents FOR UPDATE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique')
    OR public.has_role(auth.uid(),'planificateur') OR public.has_role(auth.uid(),'responsable_flotte'));

-- PESEES
CREATE POLICY pesees_select ON public.pesees_pont_bascule FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY pesees_insert ON public.pesees_pont_bascule FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique')
    OR public.has_role(auth.uid(),'planificateur') OR public.has_role(auth.uid(),'chauffeur'));
CREATE POLICY pesees_update ON public.pesees_pont_bascule FOR UPDATE
  USING (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur'));

-- GPS
CREATE POLICY gps_select ON public.gps_positions FOR SELECT
  USING (public.has_role(auth.uid(),'admin_it') OR public.has_role(auth.uid(),'plant_manager')
    OR public.has_role(auth.uid(),'manager_logistique') OR public.has_role(auth.uid(),'planificateur')
    OR public.has_role(auth.uid(),'responsable_flotte')
    OR (public.has_role(auth.uid(),'chauffeur') AND mission_id IN (
      SELECT id FROM public.missions WHERE chauffeur_id IN (SELECT id FROM public.chauffeurs WHERE user_id = auth.uid()))));
CREATE POLICY gps_insert ON public.gps_positions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'plant_manager') OR public.has_role(auth.uid(),'manager_logistique')
    OR public.has_role(auth.uid(),'planificateur')
    OR (public.has_role(auth.uid(),'chauffeur') AND mission_id IN (
      SELECT id FROM public.missions WHERE chauffeur_id IN (SELECT id FROM public.chauffeurs WHERE user_id = auth.uid()))));
