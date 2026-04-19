
-- Drop existing trigger if any to recreate cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate handle_new_user to read role from raw_user_meta_data (with fallback to chauffeur)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_role_text text;
BEGIN
  INSERT INTO public.profiles (user_id, nom, prenom, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    NEW.email
  )
  ON CONFLICT DO NOTHING;

  v_role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'chauffeur');
  BEGIN
    v_role := v_role_text::public.app_role;
  EXCEPTION WHEN others THEN
    v_role := 'chauffeur'::public.app_role;
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Attach trigger so signup auto-provisions profile + role
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
