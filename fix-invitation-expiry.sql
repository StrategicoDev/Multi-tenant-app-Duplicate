-- Automatically mark expired invitations
-- This function checks and updates invitation status from 'pending' to 'expired' when they expire

-- Create function to mark expired invitations
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE public.invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function that runs before SELECT to ensure expired invitations are marked
CREATE OR REPLACE FUNCTION check_invitation_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.expires_at < NOW() THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before insert/update
DROP TRIGGER IF EXISTS invitation_expiry_check ON invitations;
CREATE TRIGGER invitation_expiry_check
  BEFORE INSERT OR UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_invitation_expiry();

-- Run once to update existing expired invitations
SELECT mark_expired_invitations();

-- Note: For automatic periodic updates, you would need to use pg_cron extension:
-- SELECT cron.schedule('mark-expired-invitations', '0 * * * *', 'SELECT mark_expired_invitations();');
-- This runs hourly. Requires pg_cron extension to be enabled in Supabase.
