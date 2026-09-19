import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import { parseAcademicDocument } from "@/lib/academic-document-parser";
import { screenAcademicText } from "@/lib/academic-document-screening";

function removeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        result[key] = removeUndefined(item);
      }
    }

    return result as T;
  }

  return value;
}

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

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);

    const snapshot = await getAdminDb()
      .collection("academicImports")
      .orderBy("uploadedAt", "desc")
      .limit(50)
      .get();

    const imports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ imports });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load imports.",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = await requireSuperAdmin(request);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No document was uploaded." },
        { status: 400 }
      );
    }

    const validExtension =
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".docx") ||
      file.name.toLowerCase().endsWith(".txt");

    if (!validExtension) {
      return NextResponse.json(
        { error: "Only PDF, DOCX and TXT documents are supported." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Document must be 10MB or smaller." },
        { status: 400 }
      );
    }

    const parsed = await parseAcademicDocument(file);

    const elements = screenAcademicText(parsed.text);
    const safeElements = removeUndefined(elements);

    const ref = getAdminDb().collection("academicImports").doc();

    await ref.set({
      fileName: parsed.fileName,
      contentType: parsed.contentType,
      size: file.size,
      extractedText: parsed.text,
      elements: safeElements,
      elementCount: elements.length,
      status: "screened",
      reviewStatus: "pending",
      uploadedBy: token.uid,
      uploadedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: "admin_upload",
    });

    return NextResponse.json({
      success: true,
      importId: ref.id,
      fileName: parsed.fileName,
      extractedCharacters: parsed.text.length,
      elementCount: elements.length,
      status: "screened",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process document.",
      },
      { status: 400 }
    );
  }
}
