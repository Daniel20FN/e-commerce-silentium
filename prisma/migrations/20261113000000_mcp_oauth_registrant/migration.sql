BEGIN;
-- Keyed hash (HMAC-SHA256) of the registering network, only for per-source
-- limits on dynamic client registration. Never a raw IP; cleared on authorization.
ALTER TABLE public."McpOAuthClient" ADD COLUMN "registrantHash" TEXT;

ALTER TABLE public."McpOAuthClient" ADD CONSTRAINT "mcp_oauth_client_registrant_hmac" CHECK ("registrantHash" IS NULL OR "registrantHash" ~ '^[0-9a-f]{64}$');

CREATE INDEX "McpOAuthClient_registrantHash_createdAt_idx" ON public."McpOAuthClient"("registrantHash", "createdAt");
COMMIT;
