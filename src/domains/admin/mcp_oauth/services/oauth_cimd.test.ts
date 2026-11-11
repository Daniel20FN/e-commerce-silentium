/**
 * @jest-environment node
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import net from "node:net";
import {
  CimdError,
  createClientMetadataFetcher,
  createGuardedLookup,
  type CimdResolver,
  type CimdTransport,
} from "./oauth_cimd";
import { clientMetadataDocumentSchema } from "./oauth_rules";

const CLIENT_URL = "https://app.example.com/oauth/client.json";

type Found = { address: string; family: 4 | 6 };

const resolverFor =
  (...addresses: Found[]): CimdResolver =>
  (_hostname, _options, callback) =>
    callback(null, addresses);

let server: http.Server;
let port: number;
let body: string;
let contentType: string;

beforeAll(async () => {
  server = http.createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": contentType });
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  contentType = "application/json";
  body = JSON.stringify({
    client_id: CLIENT_URL,
    client_name: "Cliente CIMD",
    redirect_uris: ["https://app.example.com/callback"],
  });
});

/** Connects through the real net stack, as the http(s) agents do. */
function connectWithLookup(
  lookup: ReturnType<typeof createGuardedLookup>,
  autoSelectFamily: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({
      host: "client.example",
      port,
      lookup,
      autoSelectFamily,
    });
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.once("error", reject);
  });
}

describe("createGuardedLookup (SSRF guard on the dialed connection)", () => {
  const loopback = resolverFor({ address: "127.0.0.1", family: 4 });
  const allowAll = { isAllowed: () => true };

  it.each([true, false])(
    "connects through the real net stack with autoSelectFamily=%s (array and single-address modes)",
    async (autoSelectFamily) => {
      const lookup = createGuardedLookup({ resolve: loopback, ...allowAll });
      await expect(
        connectWithLookup(lookup, autoSelectFamily),
      ).resolves.toBeUndefined();
    },
  );

  it("returns an address array when called with { all: true }", () => {
    const lookup = createGuardedLookup({
      resolve: resolverFor(
        { address: "93.184.216.34", family: 4 },
        { address: "2606:2800:220:1::1", family: 6 },
      ),
    });
    const callback = jest.fn();
    lookup("client.example", { all: true }, callback);
    expect(callback).toHaveBeenCalledWith(null, [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1::1", family: 6 },
    ]);
  });

  it("returns a single address without { all: true } and honours the family hint", () => {
    const lookup = createGuardedLookup({
      resolve: resolverFor(
        { address: "93.184.216.34", family: 4 },
        { address: "2606:2800:220:1::1", family: 6 },
      ),
    });
    const callback = jest.fn();
    lookup("client.example", { family: 6 }, callback);
    expect(callback).toHaveBeenCalledWith(null, "2606:2800:220:1::1", 6);
  });

  const blockedCases: [string, Found[]][] = [
    [
      "mixed public/private answers",
      [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.5", family: 4 },
      ],
    ],
    ["loopback", [{ address: "127.0.0.1", family: 4 }]],
    [
      "link-local metadata address",
      [{ address: "169.254.169.254", family: 4 }],
    ],
    ["IPv6 loopback", [{ address: "::1", family: 6 }]],
  ];
  it.each(blockedCases)("refuses %s in both modes", (_name, addresses) => {
    const lookup = createGuardedLookup({ resolve: resolverFor(...addresses) });
    for (const options of [{ all: true }, {}]) {
      const callback = jest.fn();
      lookup("client.example", options, callback);
      const error = callback.mock.calls[0]?.[0] as Error;
      expect(error.message).toBe("cimd_blocked_address");
    }
  });

  it("treats resolver errors and empty answers as failures", () => {
    const failing = createGuardedLookup({
      resolve: (_host, _options, callback) =>
        callback(new Error("ENOTFOUND"), []),
    });
    const empty = createGuardedLookup({ resolve: resolverFor() });
    for (const lookup of [failing, empty]) {
      const callback = jest.fn();
      lookup("client.example", { all: true }, callback);
      expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    }
  });

  it("the default policy rejects a hostname that only resolves to loopback", async () => {
    const lookup = createGuardedLookup();
    const error = await new Promise<Error | null>((resolve) =>
      lookup("localhost", { all: true }, (err) => resolve(err)),
    );
    expect(error?.message).toBe("cimd_blocked_address");
  });
});

describe("createClientMetadataFetcher (real http request path)", () => {
  // The https transport is swapped for plain http against a local server; the
  // hostname still goes through the agent's DNS lookup (the guarded one).
  const localTransport: CimdTransport = (url, options, onResponse) => {
    const { hostname, pathname } = new URL(url);
    return http.request(
      { ...options, host: hostname, port, path: pathname },
      onResponse,
    );
  };
  const lookup = createGuardedLookup({
    resolve: resolverFor({ address: "127.0.0.1", family: 4 }),
    isAllowed: () => true,
  });
  const fetcher = createClientMetadataFetcher({
    transport: localTransport,
    lookup,
  });

  it("fetches and validates a document using the guarded lookup with default family selection", async () => {
    const { document, ttlSeconds } = await fetcher(CLIENT_URL);
    expect(document.client_name).toBe("Cliente CIMD");
    expect(ttlSeconds).toBeGreaterThanOrEqual(300);
  });

  it("rejects a document whose client_id differs from its URL", async () => {
    body = JSON.stringify({
      client_id: "https://other.example.com/x.json",
      client_name: "Otro",
      redirect_uris: ["https://app.example.com/callback"],
    });
    await expect(fetcher(CLIENT_URL)).rejects.toMatchObject({
      message: "cimd_client_id_mismatch",
    });
  });

  it("rejects non-JSON responses and documents without client_name", async () => {
    contentType = "text/html";
    await expect(fetcher(CLIENT_URL)).rejects.toBeInstanceOf(CimdError);
    contentType = "application/json";
    body = JSON.stringify({
      client_id: CLIENT_URL,
      redirect_uris: ["https://app.example.com/callback"],
    });
    await expect(fetcher(CLIENT_URL)).rejects.toMatchObject({
      message: "cimd_invalid_document",
    });
  });

  it("with the default policy a blocked address aborts the request", async () => {
    const blocked = createClientMetadataFetcher({
      transport: localTransport,
      lookup: createGuardedLookup({
        resolve: resolverFor({ address: "127.0.0.1", family: 4 }),
      }),
    });
    await expect(blocked(CLIENT_URL)).rejects.toMatchObject({
      message: "cimd_fetch_failed",
    });
  });

  it("refuses URLs that are not acceptable metadata document URLs before any lookup", async () => {
    await expect(fetcher("https://127.0.0.1/x.json")).rejects.toMatchObject({
      message: "cimd_invalid_url",
    });
  });
});

describe("clientMetadataDocumentSchema", () => {
  it("requires client_name (MCP authorization spec 2026-07-28)", () => {
    const base = {
      client_id: CLIENT_URL,
      redirect_uris: ["https://app.example.com/callback"],
    };
    expect(clientMetadataDocumentSchema.safeParse(base).success).toBe(false);
    expect(
      clientMetadataDocumentSchema.safeParse({ ...base, client_name: "  " })
        .success,
    ).toBe(false);
    expect(
      clientMetadataDocumentSchema.safeParse({ ...base, client_name: "Ok" })
        .success,
    ).toBe(true);
  });
});
