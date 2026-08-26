/**
 * Set a user's role, or list who holds which role.
 *
 *   npx tsx scripts/set-role.ts --list
 *   npx tsx scripts/set-role.ts --list ADMIN
 *   npx tsx scripts/set-role.ts someone@example.ee ADMIN
 *
 * This is deliberately a CLI script and not a page: making the first ADMIN is
 * the one thing that cannot be done from inside the app, and anyone who can run
 * this already has shell and database access, so it grants nothing new. It is
 * also the way back in if every admin account is lost.
 *
 * Later role changes belong in /admin/users — see admin-page-plan.md.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const ROLES = ["ADMIN", "ORGANIZER", "COMPETITOR"] as const;
type Role = (typeof ROLES)[number];

const prisma = new PrismaClient();

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function usage(): never {
  console.error(
    [
      "Usage:",
      "  npx tsx scripts/set-role.ts --list [ROLE]",
      "  npx tsx scripts/set-role.ts <email> <ROLE>",
      "",
      `Roles: ${ROLES.join(" | ")}`,
    ].join("\n")
  );
  process.exit(1);
}

async function list(role?: string) {
  if (role && !isRole(role)) usage();

  const users = await prisma.user.findMany({
    where: role ? { role: role as Role } : undefined,
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  if (users.length === 0) {
    console.log(role ? `No users with role ${role}.` : "No users.");
    return;
  }

  for (const u of users) {
    console.log(`${String(u.id).padStart(5)}  ${u.role.padEnd(10)}  ${u.email}  ${u.name}`);
  }
  console.log(`\n${users.length} user(s).`);
}

async function setRole(email: string, role: Role) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    console.error(`No user with email ${email}. Create the account first, then set its role.`);
    process.exit(1);
  }

  if (user.role === role) {
    console.log(`${user.email} is already ${role}. Nothing to do.`);
    return;
  }

  // Refuse to remove the last admin — the same guard the /admin/users page will
  // enforce. Recovering from zero admins needs database access.
  if (user.role === "ADMIN" && role !== "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      console.error(
        `${user.email} is the last ADMIN. Promote someone else first, or nobody can administer the app.`
      );
      process.exit(1);
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { role } });

  console.log(`${user.email} (${user.name}): ${user.role} -> ${role}`);
  console.log(
    "The role is carried in the user's session token, so it may take a re-login to take effect."
  );
}

async function main() {
  const [first, second] = process.argv.slice(2);

  if (!first) usage();

  if (first === "--list") {
    await list(second);
    return;
  }

  if (!second || !isRole(second)) usage();

  await setRole(first, second);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
