import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const decoded = await verifyBearerToken(request);

    const [userSnap, studentSnap] = await Promise.all([
      adminDb.collection("users").doc(decoded.uid).get(),
      adminDb.collection("students").doc(decoded.uid).get(),
    ]);

    return NextResponse.json({
      success: true,
      user: userSnap.exists ? userSnap.data() : null,
      student: studentSnap.exists ? studentSnap.data() : null,
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }
}
