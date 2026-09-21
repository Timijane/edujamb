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

    const body = await request.json();

    const {
      fileUrl,
      publicId,
      fileName,
      contentType,
      size,
    } = body as {
      fileUrl?: string;
      publicId?: string;
      fileName?: string;
      contentType?: string;
      size?: number;
    };

    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { error: "Cloudinary file URL and file name are required." },
        { status: 400 }
      );
    }

    const cloudinaryUrl = new URL(fileUrl);

    if (
      cloudinaryUrl.protocol !== "https:" ||
      cloudinaryUrl.hostname !== "res.cloudinary.com" ||
      !cloudinaryUrl.pathname.startsWith("/dmbjrohtn/")
    ) {
      return NextResponse.json(
        { error: "Invalid academic document storage URL." },
        { status: 400 }
      );
    }

    const lowerFileName = fileName.toLowerCase();

    const validExtension =
      lowerFileName.endsWith(".pdf") ||
      lowerFileName.endsWith(".docx") ||
      lowerFileName.endsWith(".txt");

    if (!validExtension) {
      return NextResponse.json(
        { error: "Only PDF, DOCX and TXT documents are supported." },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (typeof size === "number" && size >= maxSize) {
      return NextResponse.json(
        { error: "Document must be less than 5MB." },
        { status: 400 }
      );
    }

    const cloudinaryResponse = await fetch(fileUrl);

    if (!cloudinaryResponse.ok) {
      throw new Error(
        `Unable to retrieve the document from Cloudinary (${cloudinaryResponse.status}).`
      );
    }

    const arrayBuffer = await cloudinaryResponse.arrayBuffer();

    if (arrayBuffer.byteLength >= maxSize) {
      return NextResponse.json(
        { error: "Document must be less than 5MB." },
        { status: 400 }
      );
    }

    const file = new File(
      [arrayBuffer],
      fileName,
      {
        type: contentType || cloudinaryResponse.headers.get("content-type") || "application/octet-stream",
      }
    );

    const parsed = await parseAcademicDocument(file);

    const elements = screenAcademicText(parsed.text);
    const safeElements = removeUndefined(elements);

    const ref = getAdminDb().collection("academicImports").doc();

    await ref.set({
      fileName: parsed.fileName,
      contentType: parsed.contentType,
      size: arrayBuffer.byteLength,
      extractedText: parsed.text,
      elements: safeElements,
      elementCount: elements.length,
      status: "screened",
      reviewStatus: "pending",
      uploadedBy: token.uid,
      uploadedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: "cloudinary_admin_upload",
      cloudinaryUrl: fileUrl,
      cloudinaryPublicId: publicId || null,
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
