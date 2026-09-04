import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

const MANAGED_ROLES = new Set(["admin", "supporter", "teacher"]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const caller = await verifyBearerToken(request);
    const callerDoc = await adminDb.collection("adminUsers").doc(caller.uid).get();

    if (!callerDoc.exists || callerDoc.data()?.active !== true || callerDoc.data()?.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Only the Super Admin can create delegated accounts." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = clean(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const displayName = clean(body.displayName);
    const role = clean(body.role);

    if (!email || !password || !displayName || !MANAGED_ROLES.has(role)) {
      return NextResponse.json(
        { success: false, message: "Name, Gmail/email, password and a valid role are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    let user;
    try {
      user = await adminAuth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
        disabled: false,
      });
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "";

      if (code.includes("email-already-exists")) {
        return NextResponse.json(
          { success: false, message: "An account with this email already exists." },
          { status: 409 }
        );
      }

      throw error;
    }

    if (role === "teacher") {
      await adminDb.collection("teacherUsers").doc(user.uid).set({
        email,
        displayName,
        role,
        active: true,
        createdBy: caller.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await adminDb.collection("adminUsers").doc(user.uid).set({
        email,
        displayName,
        role,
        active: true,
        createdBy: caller.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await adminDb.collection("users").doc(user.uid).set({
      accountType: role === "teacher" ? "teacher" : "staff",
      email,
      role,
      onboardingComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      uid: user.uid,
      message: `${role} account created successfully.`,
    });
  } catch (error) {
    console.error("Team creation error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to create the account." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const caller = await verifyBearerToken(request);
    const callerDoc = await adminDb.collection("adminUsers").doc(caller.uid).get();

    if (!callerDoc.exists || callerDoc.data()?.active !== true || callerDoc.data()?.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const [admins, teachers] = await Promise.all([
      adminDb.collection("adminUsers").get(),
      adminDb.collection("teacherUsers").get(),
    ]);

    const members = [
      ...admins.docs.map((doc) => ({ uid: doc.id, type: "staff", ...doc.data() })),
      ...teachers.docs.map((doc) => ({ uid: doc.id, type: "teacher", ...doc.data() })),
    ];

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error("Team list error:", error);
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }
}
