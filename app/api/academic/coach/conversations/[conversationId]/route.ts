import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ conversationId: string }>;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getOwnedConversation(request: Request, conversationId: string) {
  const decoded = await verifyBearerToken(request);
  const db = getAdminDb();

  const ref = db.collection("aiCoachConversations").doc(conversationId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error("Conversation not found.");
  }

  const data = snapshot.data() || {};

  if (data.userId !== decoded.uid) {
    throw new Error("Unauthorized.");
  }

  return { decoded, db, ref, data };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { conversationId } = await params;
    const { ref, data } = await getOwnedConversation(request, conversationId);

    const messagesSnapshot = await ref
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(200)
      .get();

    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      conversation: {
        id: ref.id,
        ...data,
      },
      messages,
    });
  } catch (error) {
    console.error("Coach conversation GET error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to load conversation.";

    return NextResponse.json(
      { success: false, message },
      { status: message === "Unauthorized." ? 403 : 404 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { conversationId } = await params;
    const { ref } = await getOwnedConversation(request, conversationId);

    const body = await request.json().catch(() => ({}));

    const role = text(body.role);
    const content = text(body.content);

    if (role !== "user" && role !== "assistant") {
      return NextResponse.json(
        { success: false, message: "Invalid message role." },
        { status: 400 },
      );
    }

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Message content is required." },
        { status: 400 },
      );
    }

    const citations = Array.isArray(body.citations)
      ? body.citations
          .filter(
            (citation: unknown) =>
              citation &&
              typeof citation === "object" &&
              typeof (citation as { url?: unknown }).url === "string",
          )
          .slice(0, 10)
      : [];

    const now = new Date();

    const messageRef = ref.collection("messages").doc();

    await messageRef.set({
      role,
      content: content.slice(0, 20000),
      citations,
      createdAt: now,
      interactionId: text(body.interactionId) || null,
    });

    await ref.update({
      lastMessage: content.slice(0, 200),
      lastRole: role,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: {
        id: messageRef.id,
        role,
        content,
        citations,
      },
    });
  } catch (error) {
    console.error("Coach conversation message POST error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to save message.";

    return NextResponse.json(
      { success: false, message },
      { status: message === "Unauthorized." ? 403 : 400 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { conversationId } = await params;
    const { ref } = await getOwnedConversation(request, conversationId);

    const body = await request.json().catch(() => ({}));
    const action = text(body.action);

    if (action === "rename") {
      const title = text(body.title).slice(0, 100);

      if (!title) {
        return NextResponse.json(
          { success: false, message: "Conversation title is required." },
          { status: 400 },
        );
      }

      await ref.update({
        title,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        title,
      });
    }

    if (action === "archive") {
      await ref.update({
        archived: true,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
      });
    }

    if (action === "restore") {
      await ref.update({
        archived: false,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
      });
    }

    if (action === "interaction") {
      const interactionId = text(body.interactionId);

      await ref.update({
        interactionId: interactionId || null,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      { success: false, message: "Unsupported action." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Coach conversation PATCH error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to update conversation.";

    return NextResponse.json(
      { success: false, message },
      { status: message === "Unauthorized." ? 403 : 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { conversationId } = await params;
    const { ref } = await getOwnedConversation(request, conversationId);

    await ref.update({
      archived: true,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Coach conversation DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to archive conversation.",
      },
      { status: 400 },
    );
  }
}
