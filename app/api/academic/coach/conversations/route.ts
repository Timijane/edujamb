import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    const decoded = await verifyBearerToken(request);
    const snapshot = await getAdminDb()
      .collection("aiCoachConversations")
      .where("userId", "==", decoded.uid)
      .where("archived", "==", false)
      .limit(50)
      .get();

    const conversations = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt ?? null,
        };
      })
      .sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error("Coach conversations GET error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load conversations." },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const decoded = await verifyBearerToken(request);
    const body = await request.json().catch(() => ({}));

    const title = text(body.title).slice(0, 100) || "New conversation";
    const interactionId = text(body.interactionId);

    const db = getAdminDb();
    const ref = db.collection("aiCoachConversations").doc();
    const now = new Date();

    await ref.set({
      userId: decoded.uid,
      title,
      lastMessage: "",
      lastRole: "",
      interactionId: interactionId || null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      conversation: { id: ref.id, title },
    });
  } catch (error) {
    console.error("Coach conversation POST error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to create conversation." },
      { status: 400 },
    );
  }
}
