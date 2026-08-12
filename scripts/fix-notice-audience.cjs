const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  await p.$executeRawUnsafe(
    "UPDATE Notice SET audience = 'STAFF' WHERE priority = 'HIGH' AND (audience = 'CUSTOMER' OR audience IS NULL OR audience = '')",
  );
  const rows = await p.$queryRawUnsafe(
    "SELECT id, title, priority, audience FROM Notice ORDER BY createdAt DESC LIMIT 10",
  );
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
