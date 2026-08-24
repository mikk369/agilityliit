const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seed() {
  const hash = await bcrypt.hash("mikk12", 12);
  const user = await prisma.user.upsert({
    where: { email: "nisu.uuno@test.ee" },
    update: {},
    create: {
      name: "Nisu Uuno",
      email: "nisu.uuno@test.ee",
      password: hash,
      role: "ORGANIZER",
    },
  });
  console.log("Created user:", user.id, user.name, user.email, user.role);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
