/**
 * In-memory stand-in for the four OAuth Prisma delegates, used by unit tests so
 * the whole authorization flow runs without touching any real database. It
 * implements only the query shapes the services use.
 */

export type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;

function matchValue(actual: unknown, cond: unknown): boolean {
  if (cond instanceof Date)
    return actual instanceof Date && actual.getTime() === cond.getTime();
  if (cond !== null && typeof cond === "object") {
    const c = cond as Record<string, unknown>;
    if ("lt" in c)
      return (
        actual instanceof Date && actual.getTime() < (c.lt as Date).getTime()
      );
    if ("gt" in c)
      return (
        actual instanceof Date && actual.getTime() > (c.gt as Date).getTime()
      );
    if ("in" in c) return (c.in as unknown[]).includes(actual);
    if ("not" in c)
      return c.not === null
        ? actual !== null && actual !== undefined
        : actual !== c.not;
    return false;
  }
  return (actual ?? null) === cond;
}

class Table {
  rows: Row[] = [];
  private counter = 0;

  constructor(
    private readonly prefix: string,
    private readonly decorate: (row: Row) => Row = (row) => row,
    private readonly special: (
      row: Row,
      key: string,
      cond: unknown,
    ) => boolean | null = () => null,
  ) {}

  private matches(row: Row, where: Where = {}): boolean {
    return Object.entries(where).every(([key, cond]) => {
      if (key === "OR")
        return (cond as Where[]).some((branch) => this.matches(row, branch));
      const special = this.special(row, key, cond);
      return special ?? matchValue(row[key], cond);
    });
  }

  private find(where?: Where): Row[] {
    return this.rows.filter((row) => this.matches(row, where));
  }

  reset(): void {
    this.rows = [];
    this.counter = 0;
  }

  insert(data: Record<string, unknown>): Row {
    const row: Row = {
      id: `${this.prefix}_${++this.counter}`,
      createdAt: new Date(),
      usedAt: null,
      revokedAt: null,
      lastUsedAt: null,
      ...data,
    };
    this.rows.push(row);
    return row;
  }

  api() {
    return {
      create: ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(this.decorate(this.insert(data))),
      findUnique: ({ where }: { where: Where }) =>
        Promise.resolve(
          this.find(where)[0] ? this.decorate(this.find(where)[0]!) : null,
        ),
      findFirst: ({ where }: { where: Where }) =>
        Promise.resolve(
          this.find(where)[0] ? this.decorate(this.find(where)[0]!) : null,
        ),
      findMany: ({
        where,
        orderBy,
        skip = 0,
        take,
      }: {
        where?: Where;
        orderBy?: Record<string, "asc" | "desc">;
        skip?: number;
        take?: number;
      } = {}) => {
        let rows = this.find(where);
        const [[key, direction]] = Object.entries(
          orderBy ?? { createdAt: "asc" },
        );
        rows = [...rows].sort((a, b) => {
          const delta =
            (a[key as string] as Date).getTime() -
            (b[key as string] as Date).getTime();
          return direction === "desc"
            ? -delta || b.id.localeCompare(a.id, undefined, { numeric: true })
            : delta;
        });
        return Promise.resolve(
          rows.slice(skip, take ? skip + take : undefined).map(this.decorate),
        );
      },
      count: ({ where }: { where?: Where } = {}) =>
        Promise.resolve(this.find(where).length),
      update: ({
        where,
        data,
      }: {
        where: Where;
        data: Record<string, unknown>;
      }) => {
        const row = this.find(where)[0];
        if (!row) return Promise.reject(new Error("not_found"));
        Object.assign(row, data);
        return Promise.resolve(this.decorate(row));
      },
      updateMany: ({
        where,
        data,
      }: {
        where: Where;
        data: Record<string, unknown>;
      }) => {
        const found = this.find(where);
        found.forEach((row) => Object.assign(row, data));
        return Promise.resolve({ count: found.length });
      },
      createMany: ({ data }: { data: Record<string, unknown>[] }) => {
        data.forEach((entry) => this.insert(entry));
        return Promise.resolve({ count: data.length });
      },
      deleteMany: ({ where }: { where?: Where } = {}) => {
        const found = new Set(this.find(where));
        this.rows = this.rows.filter((row) => !found.has(row));
        return Promise.resolve({ count: found.size });
      },
      upsert: ({
        where,
        create,
        update,
      }: {
        where: Where;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const row = this.find(where)[0];
        if (row) {
          Object.assign(row, update);
          return Promise.resolve(this.decorate(row));
        }
        return Promise.resolve(
          this.decorate(this.insert({ ...where, ...create })),
        );
      },
    };
  }
}

export interface FakeUser {
  id: string;
  email: string;
  role: string;
  status: string;
  profile: { firstName: string; lastName: string } | null;
}

export function createFakeOAuthDb() {
  const users = new Map<string, FakeUser>();
  const clients: Table = new Table("client", undefined, (row, key, cond) => {
    if (key === "grants") {
      const none = (cond as { none?: unknown }).none;
      if (none) return !grants.rows.some((g) => g.clientRowId === row.id);
    }
    return null;
  });
  const tokens: Table = new Table("token", (row) => ({
    ...row,
    grant: grants.rows.find((g) => g.id === row.grantId)
      ? decorateGrant(grants.rows.find((g) => g.id === row.grantId)!)
      : null,
  }));
  const decorateGrant = (row: Row): Row => ({
    ...row,
    user: users.get(row.userId as string) ?? null,
    client: clients.rows.find((c) => c.id === row.clientRowId) ?? null,
  });
  const grants: Table = new Table("grant", decorateGrant);
  const codes: Table = new Table("code", (row) => ({
    ...row,
    user: users.get(row.userId as string) ?? null,
  }));

  const grantApi = grants.api();
  const prisma = {
    mcpOAuthClient: clients.api(),
    mcpOAuthCode: codes.api(),
    mcpOAuthToken: tokens.api(),
    mcpOAuthGrant: {
      ...grantApi,
      create: ({
        data,
      }: {
        data: Record<string, unknown> & {
          tokens?: { create: Record<string, unknown>[] };
        };
      }) => {
        const { tokens: nested, ...rest } = data;
        const grant = grants.insert(rest);
        nested?.create.forEach((token) =>
          tokens.insert({ ...token, grantId: grant.id }),
        );
        return Promise.resolve(decorateGrant(grant));
      },
    },
  };

  return {
    prisma,
    users,
    clients,
    codes,
    grants,
    tokens,
    reset(): void {
      [clients, codes, grants, tokens].forEach((table) => table.reset());
      users.clear();
    },
  };
}

export type FakeOAuthDb = ReturnType<typeof createFakeOAuthDb>;

/** Shared instance: `jest.mock("@/lib/prisma")` factories and tests both use it. */
export const fakeOAuthDb = createFakeOAuthDb();
