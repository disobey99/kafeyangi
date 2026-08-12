import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StaffNav } from "@/components/staff-nav";
import { DisplayPanel } from "@/components/display-panel";
import { DisplayShell } from "@/components/staff-shell";
import { requireDisplayPage } from "@/lib/session-guard";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  const { session } = await requireDisplayPage(cafeId);

  return (
    <DisplayShell>
      <div className="border-b border-zinc-800 px-4 py-3">
        <StaffNav
          cafeId={cafe.id}
          cafeName={cafe.name}
          active="display"
          userName={session.name}
        />
      </div>
      <DisplayPanel cafeId={cafe.id} cafeName={cafe.name} />
    </DisplayShell>
  );
}
