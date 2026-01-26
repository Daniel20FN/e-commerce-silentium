/*
const prismaClientSingleton = () => {
  return new PrismaClient();
};

// type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClientSingleton | undefined;
// };

// const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;
*/

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PrismaJson {}
}
