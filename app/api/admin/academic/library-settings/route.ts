import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

async function requireAdmin(request: Request) {
  const token = await verifyBearerToken(request);

  if (!token?.uid) {
    throw new Error("Unauthorized.");
  }

  const adminSnap = await getAdminDb()
    .collection("adminUsers")
    .doc(token.uid)
    .get();

  if (!adminSnap.exists || adminSnap.data()?.active !== true) {
    throw new Error("Admin access required.");
  }

  const role = adminSnap.data()?.role;

  if (role !== "admin" && role !== "super_admin") {
    throw new Error("Admin access required.");
  }

  return token;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snap = await getAdminDb()
      .collection("academicLibrarySettings")
      .doc("main")
      .get();

    const data = snap.exists ? snap.data() || {} : {};

    return NextResponse.json({
      heroImage: data.heroImage || "",
      heroImageMediaId: data.heroImageMediaId || "",
      heroOverlay: typeof data.heroOverlay === "number"
        ? data.heroOverlay
        : 38,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load academic library settings.",
      },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const token = await requireAdmin(request);
    const body = await request.json();

    const heroImage =
      typeof body.heroImage === "string" ? body.heroImage : "";

    const heroImageMediaId =
      typeof body.heroImageMediaId === "string"
        ? body.heroImageMediaId
        : "";

    const heroOverlay = Number(body.heroOverlay);

    if (!Number.isFinite(heroOverlay) || heroOverlay < 0 || heroOverlay > 100) {
      return NextResponse.json(
        { error: "Hero overlay must be between 0 and 100." },
        { status: 400 },
      );
    }

    await getAdminDb()
      .collection("academicLibrarySettings")
      .doc("main")
      .set(
        {
          heroImage,
          heroImageMediaId,
          heroOverlay,
          updatedBy: token.uid,
          updatedAt: new Date(),
        },
        { merge: true },
      );

    return NextResponse.json({
      success: true,
      heroImage,
      heroImageMediaId,
      heroOverlay,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save academic library settings.",
      },
      { status: 401 },
    );
  }
}
