import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const token = await verifyBearerToken(request);

    if (!token?.uid) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const studentSnap = await getAdminDb()
      .collection("students")
      .doc(token.uid)
      .get();

    if (!studentSnap.exists) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 403 },
      );
    }

    const settingsSnap = await getAdminDb()
      .collection("academicLibrarySettings")
      .doc("main")
      .get();

    if (!settingsSnap.exists) {
      return NextResponse.json({
        heroImage: "",
        heroImageMediaId: "",
        heroOverlay: 38,
      });
    }

    const data = settingsSnap.data() || {};

    return NextResponse.json({
      heroImage: data.heroImage || "",
      heroImageMediaId: data.heroImageMediaId || "",
      heroOverlay:
        typeof data.heroOverlay === "number" ? data.heroOverlay : 38,
    });
  } catch (error) {
    console.error("[ACADEMIC LIBRARY SETTINGS]", error);

    return NextResponse.json(
      { error: "Unable to load academic library settings." },
      { status: 500 },
    );
  }
}
