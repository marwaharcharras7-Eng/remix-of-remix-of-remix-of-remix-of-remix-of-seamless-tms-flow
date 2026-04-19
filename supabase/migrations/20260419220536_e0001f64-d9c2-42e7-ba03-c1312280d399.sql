-- Trigger pour recalculer km_total véhicule + km_parcourus_total chauffeur + consommation_moyenne + taux_performance
-- À chaque mission qui passe en 'livree' ou 'cloturee'

CREATE OR REPLACE FUNCTION public.recalculer_kpis_mission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_km numeric;
  v_total_conso numeric;
  v_nb_missions integer;
  v_nb_incidents integer;
  v_nb_retards integer;
  v_ecart_conso_pct numeric;
  v_perf numeric;
  v_capacite numeric;
BEGIN
  -- Recalcul uniquement quand la mission devient livrée/clôturée/facturée
  IF NEW.statut NOT IN ('livree', 'cloturee', 'facturee') THEN
    RETURN NEW;
  END IF;

  -- ===== VÉHICULE : km_total =====
  IF NEW.vehicule_id IS NOT NULL THEN
    SELECT COALESCE(SUM(km_reels), 0)
      INTO v_total_km
    FROM public.missions
    WHERE vehicule_id = NEW.vehicule_id
      AND statut IN ('livree', 'cloturee', 'facturee');

    SELECT COALESCE(SUM(consommation_gasoil), 0), COUNT(*)
      INTO v_total_conso, v_nb_missions
    FROM public.missions
    WHERE vehicule_id = NEW.vehicule_id
      AND statut IN ('livree', 'cloturee', 'facturee')
      AND km_reels > 0;

    UPDATE public.vehicules
       SET km_total = v_total_km,
           consommation_moyenne = CASE
             WHEN v_total_km > 0 THEN ROUND((v_total_conso / v_total_km * 100)::numeric, 2)
             ELSE consommation_moyenne
           END
     WHERE id = NEW.vehicule_id;
  END IF;

  -- ===== CHAUFFEUR : km_parcourus_total + conso_moyenne + taux_performance =====
  IF NEW.chauffeur_id IS NOT NULL THEN
    SELECT COALESCE(SUM(km_reels), 0), COALESCE(SUM(consommation_gasoil), 0), COUNT(*)
      INTO v_total_km, v_total_conso, v_nb_missions
    FROM public.missions
    WHERE chauffeur_id = NEW.chauffeur_id
      AND statut IN ('livree', 'cloturee', 'facturee');

    -- Compter incidents sur ses missions
    SELECT COUNT(*)
      INTO v_nb_incidents
    FROM public.incidents i
    JOIN public.missions m ON m.id = i.mission_id
    WHERE m.chauffeur_id = NEW.chauffeur_id;

    -- Compter retards (date_fin_reelle > date_fin_prevue + 10%)
    SELECT COUNT(*)
      INTO v_nb_retards
    FROM public.missions
    WHERE chauffeur_id = NEW.chauffeur_id
      AND statut IN ('livree', 'cloturee', 'facturee')
      AND date_fin_reelle IS NOT NULL
      AND date_fin_prevue IS NOT NULL
      AND date_fin_reelle > date_fin_prevue + ((date_fin_prevue - date_debut_prevue) * 0.10);

    -- Score composite : 100 - (5×incidents) - (10 si retards >10% missions) - (5 si écart conso >15%)
    v_perf := 100 - (5 * v_nb_incidents);
    IF v_nb_missions > 0 AND (v_nb_retards::numeric / v_nb_missions) > 0.10 THEN
      v_perf := v_perf - 10;
    END IF;
    IF v_total_km > 0 THEN
      v_ecart_conso_pct := ABS((v_total_conso / v_total_km * 100) - 30) / 30 * 100; -- ref 30L/100km
      IF v_ecart_conso_pct > 15 THEN
        v_perf := v_perf - 5;
      END IF;
    END IF;
    IF v_perf < 0 THEN v_perf := 0; END IF;
    IF v_perf > 100 THEN v_perf := 100; END IF;

    UPDATE public.chauffeurs
       SET km_parcourus_total = v_total_km,
           consommation_moyenne = CASE
             WHEN v_total_km > 0 THEN ROUND((v_total_conso / v_total_km * 100)::numeric, 2)
             ELSE consommation_moyenne
           END,
           taux_performance = v_perf
     WHERE id = NEW.chauffeur_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculer_kpis_mission ON public.missions;
CREATE TRIGGER trg_recalculer_kpis_mission
  AFTER INSERT OR UPDATE OF statut, km_reels, consommation_gasoil, date_fin_reelle ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculer_kpis_mission();

-- Trigger aussi quand un incident est créé/supprimé pour recalculer la perf
CREATE OR REPLACE FUNCTION public.recalculer_perf_chauffeur_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chauffeur_id uuid;
  v_nb_incidents integer;
  v_nb_missions integer;
  v_nb_retards integer;
  v_total_km numeric;
  v_total_conso numeric;
  v_ecart_conso_pct numeric;
  v_perf numeric;
  v_mission_id uuid;
BEGIN
  v_mission_id := COALESCE(NEW.mission_id, OLD.mission_id);
  SELECT chauffeur_id INTO v_chauffeur_id FROM public.missions WHERE id = v_mission_id;
  IF v_chauffeur_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(km_reels), 0), COALESCE(SUM(consommation_gasoil), 0), COUNT(*)
    INTO v_total_km, v_total_conso, v_nb_missions
  FROM public.missions
  WHERE chauffeur_id = v_chauffeur_id
    AND statut IN ('livree', 'cloturee', 'facturee');

  SELECT COUNT(*) INTO v_nb_incidents
  FROM public.incidents i
  JOIN public.missions m ON m.id = i.mission_id
  WHERE m.chauffeur_id = v_chauffeur_id;

  SELECT COUNT(*) INTO v_nb_retards
  FROM public.missions
  WHERE chauffeur_id = v_chauffeur_id
    AND statut IN ('livree', 'cloturee', 'facturee')
    AND date_fin_reelle IS NOT NULL AND date_fin_prevue IS NOT NULL
    AND date_fin_reelle > date_fin_prevue + ((date_fin_prevue - date_debut_prevue) * 0.10);

  v_perf := 100 - (5 * v_nb_incidents);
  IF v_nb_missions > 0 AND (v_nb_retards::numeric / v_nb_missions) > 0.10 THEN
    v_perf := v_perf - 10;
  END IF;
  IF v_total_km > 0 THEN
    v_ecart_conso_pct := ABS((v_total_conso / v_total_km * 100) - 30) / 30 * 100;
    IF v_ecart_conso_pct > 15 THEN v_perf := v_perf - 5; END IF;
  END IF;
  IF v_perf < 0 THEN v_perf := 0; END IF;
  IF v_perf > 100 THEN v_perf := 100; END IF;

  UPDATE public.chauffeurs SET taux_performance = v_perf WHERE id = v_chauffeur_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_perf_incident ON public.incidents;
CREATE TRIGGER trg_recalc_perf_incident
  AFTER INSERT OR DELETE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculer_perf_chauffeur_incident();