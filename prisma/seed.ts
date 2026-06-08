import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import {
  createClient,
  type User as SupabaseAuthUser,
} from "@supabase/supabase-js";
import { seedCategories } from "./seed_categories";

const prisma = new PrismaClient();

interface RequiredAdminEnv {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface SupabaseAdminConfig {
  url: string;
  secretKey: string;
}

interface AdminMetadata {
  first_name: string;
  last_name: string;
}

interface AdminAppMetadata {
  role: UserRole;
}

const getRequiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getOptionalEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();

  return value ? value : undefined;
};

const getRequiredAnyEnv = (keys: readonly string[]): string => {
  for (const key of keys) {
    const value = getOptionalEnv(key);

    if (value) {
      return value;
    }
  }

  throw new Error(
    `Missing required environment variable. Expected one of: ${keys.join(", ")}`,
  );
};

const getAdminSeedConfig = (): RequiredAdminEnv => ({
  email: getRequiredEnv("ADMIN_USER_EMAIL").toLowerCase(),
  password: getRequiredEnv("ADMIN_USER_PASSWORD"),
  firstName: getRequiredEnv("ADMIN_USER_FIRST_NAME"),
  lastName: getRequiredEnv("ADMIN_USER_LAST_NAME"),
});

const getSupabaseAdminConfig = (): SupabaseAdminConfig => ({
  url: getRequiredAnyEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]),
  secretKey: getRequiredAnyEnv([
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]),
});

const createSupabaseAdminClient = () => {
  const config = getSupabaseAdminConfig();

  return createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const getAdminUserMetadata = (admin: RequiredAdminEnv): AdminMetadata => ({
  first_name: admin.firstName,
  last_name: admin.lastName,
});

const getAdminAppMetadata = (): AdminAppMetadata => ({
  role: UserRole.super_admin,
});

const findSupabaseUserByEmail = async (
  email: string,
): Promise<SupabaseAuthUser | null> => {
  const supabaseAdmin = createSupabaseAdminClient();
  let page = 1;
  const perPage = 200;

  while (true) {
    const response = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (response.error) {
      throw response.error;
    }

    const matchedUser = response.data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );

    if (matchedUser) {
      return matchedUser;
    }

    if (response.data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
};

const ensureSupabaseAdminUser = async (
  admin: RequiredAdminEnv,
): Promise<SupabaseAuthUser> => {
  const supabaseAdmin = createSupabaseAdminClient();
  const existingUser = await findSupabaseUserByEmail(admin.email);
  const userMetadata = getAdminUserMetadata(admin);
  const appMetadata = getAdminAppMetadata();

  if (existingUser) {
    const response = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      {
        email: admin.email,
        password: admin.password,
        email_confirm: true,
        user_metadata: userMetadata,
        app_metadata: appMetadata,
      },
    );

    if (response.error || !response.data.user) {
      throw response.error ?? new Error("Failed to update Supabase admin user");
    }

    return response.data.user;
  }

  const response = await supabaseAdmin.auth.admin.createUser({
    email: admin.email,
    password: admin.password,
    email_confirm: true,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  });

  if (response.error || !response.data.user) {
    throw response.error ?? new Error("Failed to create Supabase admin user");
  }

  return response.data.user;
};

const seedAdminUser = async (): Promise<void> => {
  const admin = getAdminSeedConfig();
  const now = new Date();
  const phone = getOptionalEnv("ADMIN_USER_PHONE");
  const authUser = await ensureSupabaseAdminUser(admin);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ supabaseAuthUserId: authUser.id }, { email: admin.email }],
    },
  });

  const user = existingUser
    ? await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          supabaseAuthUserId: authUser.id,
          email: admin.email,
          role: UserRole.super_admin,
          status: UserStatus.active,
          emailVerifiedAt: authUser.email_confirmed_at
            ? new Date(authUser.email_confirmed_at)
            : now,
          phoneVerifiedAt: authUser.phone_confirmed_at
            ? new Date(authUser.phone_confirmed_at)
            : null,
          lastLoginAt: authUser.last_sign_in_at
            ? new Date(authUser.last_sign_in_at)
            : now,
        },
      })
    : await prisma.user.create({
        data: {
          email: admin.email,
          supabaseAuthUserId: authUser.id,
          role: UserRole.super_admin,
          status: UserStatus.active,
          emailVerifiedAt: authUser.email_confirmed_at
            ? new Date(authUser.email_confirmed_at)
            : now,
          phoneVerifiedAt: authUser.phone_confirmed_at
            ? new Date(authUser.phone_confirmed_at)
            : null,
          lastLoginAt: authUser.last_sign_in_at
            ? new Date(authUser.last_sign_in_at)
            : now,
        },
      });

  await prisma.userProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone,
    },
    create: {
      userId: user.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone,
    },
  });

  await prisma.userPreference.upsert({
    where: {
      userId: user.id,
    },
    update: {},
    create: {
      userId: user.id,
    },
  });

  console.log(
    `Admin user seeded successfully for ${admin.email} (${authUser.id})`,
  );
};

const main = async (): Promise<void> => {
  await seedAdminUser();
  await seedCategories(prisma);
};

main()
  .catch((error: unknown) => {
    console.error("Admin seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
