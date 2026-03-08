import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  await prisma.$connect();
  console.log("Prisma connected successfully");
}

test();
