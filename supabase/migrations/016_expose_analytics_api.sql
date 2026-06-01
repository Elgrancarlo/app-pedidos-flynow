GRANT USAGE ON SCHEMA analytics TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA analytics TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
GRANT SELECT ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

ALTER ROLE authenticator
SET pgrst.db_schemas = 'public,storage,graphql_public,analytics';

NOTIFY pgrst, 'reload config';
