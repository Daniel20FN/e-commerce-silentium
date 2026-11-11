BEGIN;
CREATE TYPE public."McpOAuthClientSource" AS ENUM ('dynamic', 'metadata_document');

CREATE TYPE public."McpOAuthClientAuthMethod" AS ENUM ('none', 'client_secret_basic', 'client_secret_post');

CREATE TYPE public."McpOAuthTokenKind" AS ENUM ('access', 'refresh');

CREATE TABLE public."McpOAuthClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "source" public."McpOAuthClientSource" NOT NULL,
    "name" TEXT NOT NULL,
    "clientUri" TEXT,
    "redirectUris" TEXT[],
    "authMethod" public."McpOAuthClientAuthMethod" NOT NULL DEFAULT 'none',
    "secretHash" TEXT,
    "metadataExpiresAt" TIMESTAMP(3),
    "registrantHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpOAuthClient_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mcp_oauth_client_name_present" CHECK (length(btrim("name")) BETWEEN 1 AND 100),
    CONSTRAINT "mcp_oauth_client_id_length" CHECK (length("clientId") BETWEEN 1 AND 2048),
    CONSTRAINT "mcp_oauth_client_redirects_bounded" CHECK (cardinality("redirectUris") BETWEEN 1 AND 10),
    CONSTRAINT "mcp_oauth_client_registrant_hmac" CHECK ("registrantHash" IS NULL OR "registrantHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "mcp_oauth_client_secret_sha256" CHECK ("secretHash" IS NULL OR "secretHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "mcp_oauth_client_secret_matches_method" CHECK (("authMethod" = 'none') = ("secretHash" IS NULL))
);

CREATE TABLE public."McpOAuthCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "clientRowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" public."McpTokenScope"[],
    "redirectUri" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "grantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpOAuthCode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mcp_oauth_code_hash_sha256" CHECK ("codeHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "mcp_oauth_code_scopes_present" CHECK (cardinality("scopes") BETWEEN 1 AND 2)
);

CREATE TABLE public."McpOAuthGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientRowId" TEXT NOT NULL,
    "scopes" public."McpTokenScope"[],
    "resource" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpOAuthGrant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mcp_oauth_grant_scopes_present" CHECK (cardinality("scopes") BETWEEN 1 AND 2),
    CONSTRAINT "mcp_oauth_grant_expiry_after_creation" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE public."McpOAuthToken" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "kind" public."McpOAuthTokenKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpOAuthToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mcp_oauth_token_hash_sha256" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "McpOAuthClient_clientId_key" ON public."McpOAuthClient"("clientId");

CREATE INDEX "McpOAuthClient_source_createdAt_idx" ON public."McpOAuthClient"("source", "createdAt");

CREATE INDEX "McpOAuthClient_registrantHash_createdAt_idx" ON public."McpOAuthClient"("registrantHash", "createdAt");

CREATE UNIQUE INDEX "McpOAuthCode_codeHash_key" ON public."McpOAuthCode"("codeHash");

CREATE INDEX "McpOAuthCode_expiresAt_idx" ON public."McpOAuthCode"("expiresAt");

CREATE INDEX "McpOAuthCode_userId_idx" ON public."McpOAuthCode"("userId");

CREATE INDEX "McpOAuthGrant_userId_createdAt_idx" ON public."McpOAuthGrant"("userId", "createdAt");

CREATE INDEX "McpOAuthGrant_clientRowId_idx" ON public."McpOAuthGrant"("clientRowId");

CREATE INDEX "McpOAuthGrant_expiresAt_idx" ON public."McpOAuthGrant"("expiresAt");

CREATE UNIQUE INDEX "McpOAuthToken_tokenHash_key" ON public."McpOAuthToken"("tokenHash");

CREATE INDEX "McpOAuthToken_grantId_kind_createdAt_idx" ON public."McpOAuthToken"("grantId", "kind", "createdAt");

CREATE INDEX "McpOAuthToken_expiresAt_idx" ON public."McpOAuthToken"("expiresAt");

ALTER TABLE public."McpOAuthCode" ADD CONSTRAINT "McpOAuthCode_clientRowId_fkey" FOREIGN KEY ("clientRowId") REFERENCES public."McpOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."McpOAuthCode" ADD CONSTRAINT "McpOAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."McpOAuthGrant" ADD CONSTRAINT "McpOAuthGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."McpOAuthGrant" ADD CONSTRAINT "McpOAuthGrant_clientRowId_fkey" FOREIGN KEY ("clientRowId") REFERENCES public."McpOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES public."McpOAuthGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Private tables: only the server-side database role reads them. Never exposed through Supabase APIs.
ALTER TABLE public."McpOAuthClient" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."McpOAuthClient" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."McpOAuthCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."McpOAuthCode" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."McpOAuthGrant" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."McpOAuthGrant" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."McpOAuthToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."McpOAuthToken" FROM PUBLIC, anon, authenticated;
COMMIT;
