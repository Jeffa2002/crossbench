import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAddressVerified } from "@/lib/verification";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!isAddressVerified(user))
    return NextResponse.json({ error: "Address verification required before voting" }, { status: 403 });

  if (!user?.termsAcceptedAt)
    return NextResponse.json(
      { error: "Please complete account verification and accept our Terms of Service before voting." },
      { status: 403 }
    );

  const { billId, position, comment } = await req.json();
  if (!billId || !["SUPPORT", "OPPOSE", "ABSTAIN"].includes(position))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const bill = await prisma.bill.findUnique({ where: { id: billId } });
  if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

  // Reject votes on decided or lapsed bills
  const isLapsed = bill.status === 'Before Parliament' && (bill as any).parliamentNumber && (bill as any).parliamentNumber < 48;
  const isClosed = bill.status !== 'Before Parliament' || isLapsed;
  if (isClosed)
    return NextResponse.json({ error: "Voting on this bill is closed" }, { status: 403 });

  // Sanitise comment — cap at 1000 chars
  const safeComment = typeof comment === 'string' ? comment.trim().slice(0, 1000) || null : null;

  // Snapshot the user's current verification status at time of vote
  const vote = await prisma.vote.upsert({
    where: { userId_billId: { userId: user.id, billId } },
    create: {
      userId: user.id,
      billId,
      electorateId: user.electorateId,
      position,
      comment: safeComment,
      verificationStatus: user.verificationStatus,
    },
    update: {
      position,
      comment: safeComment,
      verificationStatus: user.verificationStatus,
    },
  });

  return NextResponse.json({ ok: true, vote });
}
