-- Ensure saved-search notifications only fire when a listing is publicly active.

CREATE OR REPLACE FUNCTION notify_new_listing()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND (
        TG_OP = 'INSERT'
        OR (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status))
    ) THEN
        PERFORM pg_notify('new_listing', json_build_object(
            'id', NEW.id,
            'title', NEW.title,
            'category', NEW.category,
            'price', NEW.price,
            'user_id', NEW.user_id
        )::text);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_listing ON listings;
CREATE TRIGGER trigger_notify_new_listing
    AFTER INSERT OR UPDATE OF status ON listings
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_listing();

COMMENT ON FUNCTION notify_new_listing() IS 'Sends PostgreSQL NOTIFY only when listing becomes active/public.';
