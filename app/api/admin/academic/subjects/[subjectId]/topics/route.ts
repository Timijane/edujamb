import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

async function requireSuperAdmin(request: Request) {
  const token = await verifyBearerToken(request);

  const admin = await getAdminDb()
    .collection("adminUsers")
    .doc(token.uid)
    .get();

  if (
    !admin.exists ||
    admin.data()?.active !== true ||
    admin.data()?.role !== "super_admin"
  ) {
    throw new Error("Super Admin access required.");
  }

  return token;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    await requireSuperAdmin(request);

    const { subjectId } = await params;
    const db = getAdminDb();

    const subject = await db
      .collection("academicSubjects")
      .doc(subjectId)
      .get();

    if (!subject.exists) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 404 }
      );
    }

    const snapshot = await db
      .collection("academicTopics")
      .where("subjectId", "==", subjectId)
      .get();

    const topics = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: typeof data.title === "string" ? data.title : "",
          description: typeof data.description === "string" ? data.description : "",
          order: typeof data.order === "number" ? data.order : 0,
          active: data.active === true,
          published: data.published === true,
          subjectId: typeof data.subjectId === "string" ? data.subjectId : subjectId,
        };
      })
      .sort((a, b) => a.order - b.order);

    return NextResponse.json({ topics });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load topics.",
      },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const token = await requireSuperAdmin(request);
    const { subjectId } = await params;
    const body = await request.json();

    const db = getAdminDb();

    const subject = await db
      .collection("academicSubjects")
      .doc(subjectId)
      .get();

    if (!subject.exists) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 404 }
      );
    }

    const title = String(body.title || "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Topic title is required." },
        { status: 400 }
      );
    }

    const existing = await db
      .collection("academicTopics")
      .where("subjectId", "==", subjectId)
      .where("title", "==", title)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: "A topic with this title already exists." },
        { status: 409 }
      );
    }

    const topics = await db
      .collection("academicTopics")
      .where("subjectId", "==", subjectId)
      .get();

    const ref = db.collection("academicTopics").doc();

    await ref.set({
      subjectId,
      title,
      description: String(body.description || "").trim(),
      order:
        typeof body.order === "number"
          ? body.order
          : topics.size + 1,
      active: body.active !== false,
      published: body.published === true,
      source: "manual",
      createdBy: token.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      topicId: ref.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create topic.",
      },
      { status: 400 }
    );
  }
}
