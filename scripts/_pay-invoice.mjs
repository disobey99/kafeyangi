import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const invoiceId = "cmroczxbn0003v8dk72af4p18";

const invoice = await p.billingInvoice.findUnique({
  where: { id: invoiceId },
  include: { cafe: true },
});
if (!invoice) {
  console.log("invoice not found");
  process.exit(1);
}

const now = new Date();
const days = 30;
const base =
  invoice.cafe.subscriptionEndsAt && invoice.cafe.subscriptionEndsAt > now
    ? invoice.cafe.subscriptionEndsAt
    : now;
const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

await p.$transaction([
  p.billingInvoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt: now,
      method: "PADDLE",
    },
  }),
  p.cafe.update({
    where: { id: invoice.cafeId },
    data: {
      status: "ACTIVE",
      plan: invoice.plan,
      subscriptionEndsAt: newEnd,
      suspendReason: null,
    },
  }),
]);

const cafe = await p.cafe.findUnique({ where: { id: invoice.cafeId } });
console.log({
  invoiceStatus: "PAID",
  plan: cafe?.plan,
  status: cafe?.status,
  subscriptionEndsAt: cafe?.subscriptionEndsAt?.toISOString(),
  note: "Davr: mavjud muddat oxiridan +30 kun (sinov/qolgan kun yo'qolmaydi)",
});
await p.$disconnect();
