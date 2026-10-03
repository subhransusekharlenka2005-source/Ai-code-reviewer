const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.create({
    data: {
      id: "usr_test123",
      username: "realtest",
      email: "realtest@example.com",
      passwordHash: hash,
      emailVerified: true
    }
  });
  console.log("User created:", user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
