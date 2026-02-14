/*
  # Auto-register admin users on signup

  1. New Function
    - `handle_admin_signup()` - trigger function that automatically adds users
      with @admin.com emails to the admin_users table

  2. New Trigger
    - `on_auth_user_created_admin` - fires after a new user is created in auth.users
    - Only inserts into admin_users if the email ends with @admin.com

  3. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Only @admin.com emails are granted admin access
*/

CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email LIKE '%@admin.com' THEN
    INSERT INTO public.admin_users (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_admin'
  ) THEN
    CREATE TRIGGER on_auth_user_created_admin
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_admin_signup();
  END IF;
END $$;