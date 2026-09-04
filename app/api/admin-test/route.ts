import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  try {
    await getAdminDb().collection("system").doc("adminTest").set(
      {
        status: "Firebase Admin SDK connected",
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: "Firebase Admin SDK is working correctly.",
    });
  } catch (error) {
    console.error("Firebase Admin test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Firebase Admin SDK connection failed.",
      },
      { status: 500 }
    );
  }
}
