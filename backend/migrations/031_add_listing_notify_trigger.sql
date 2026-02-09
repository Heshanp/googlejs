-- Create a function to notify on new listings
CREATE OR REPLACE FUNCTION notify_new_listing()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification with listing ID as payload
    PERFORM pg_notify('new_listing', json_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'category', NEW.category,
        'price', NEW.price,
        'user_id', NEW.user_id
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to fire on new listing inserts
DROP TRIGGER IF EXISTS trigger_notify_new_listing ON listings;
CREATE TRIGGER trigger_notify_new_listing
    AFTER INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_listing();

-- Comments for documentation
COMMENT ON FUNCTION notify_new_listing() IS 'Sends PostgreSQL NOTIFY on new listing insert for real-time saved search matching';
