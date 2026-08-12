import { PrismaClient } from "@prisma/client";

const chatId = process.argv[2];
const slug = process.argv[3] ?? "demo-kafe";

if (!chatId) {
  console.error("Usage: node scripts/set-telegram-chat.mjs <chatId> [slug]");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const cafe = await prisma.cafe.update({
    where: { slug },
    data: { telegramChatId: chatId },
    select: { slug: true, name: true, telegramChatId: true },
  });
  console.log("Updated:", cafe);
} catch (e) {
  console.error(e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
