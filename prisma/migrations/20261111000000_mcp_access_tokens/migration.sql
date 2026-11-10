BEGIN;
CREATE TYPE public."McpTokenScope" AS ENUM ('read', 'write');

CREATE TABLE public."McpAccessToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "scopes" public."McpTokenScope"[],
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "McpAccessToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mcp_token_hash_sha256" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "mcp_token_name_present" CHECK (length(btrim("name")) BETWEEN 1 AND 80),
  CONSTRAINT "mcp_token_scopes_present" CHECK (cardinality("scopes") BETWEEN 1 AND 2),
  CONSTRAINT "mcp_token_expiry_after_creation" CHECK ("expiresAt" > "createdAt")
);

CREATE UNIQUE INDEX "McpAccessToken_tokenHash_key" ON public."McpAccessToken"("tokenHash");
CREATE INDEX "McpAccessToken_userId_createdAt_idx" ON public."McpAccessToken"("userId", "createdAt");
ALTER TABLE public."McpAccessToken" ADD CONSTRAINT "McpAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Private table: only the server-side database role reads it. Never exposed through Supabase APIs.
ALTER TABLE public."McpAccessToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."McpAccessToken" FROM PUBLIC, anon, authenticated;
COMMIT;
