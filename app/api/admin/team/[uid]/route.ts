import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const caller = await verifyBearerToken(request);
    const callerDoc = await adminDb.collection("adminUsers").doc(caller.uid).get();

    if (!callerDoc.exists || callerDoc.data()?.active !== true || callerDoc.data()?.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const { uid } = await context.params;

    if (uid === caller.uid) {
      return NextResponse.json(
        { success: false, message: "The Super Admin account cannot be disabled from this screen." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const active = body.active === true;

    const adminRef = adminDb.collection("adminUsers").doc(uid);
    const teacherRef = adminDb.collection("teacherUsers").doc(uid);

    const [adminSnap, teacherSnap] = await Promise.all([
      adminRef.get(),
      teacherRef.get(),
    ]);

    if (!adminSnap.exists && !teacherSnap.exists) {
      return NextResponse.json({ success: false, message: "Team member not found." }, { status: 404 });
    }

    await adminAuth.updateUser(uid, { disabled: !active });

    if (adminSnap.exists) {
      await adminRef.update({ active, updatedAt: new Date() });
    }

    if (teacherSnap.exists) {
      await teacherRef.update({ active, updatedAt: new Date() });
    }

    return NextResponse.json({
      success: true,
      message: active ? "Account enabled." : "Account disabled.",
    });
  } catch (error) {
    console.error("Team update error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update the account." },
      { status: 500 }
    );
  }
}
