import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const decoded = await verifyBearerToken(request);
    const uid = decoded.uid;

    const [userSnap, studentSnap, teacherSnap, adminSnap] = await Promise.all([
      getAdminDb().collection("users").doc(uid).get(),
      getAdminDb().collection("students").doc(uid).get(),
      getAdminDb().collection("teacherUsers").doc(uid).get(),
      getAdminDb().collection("adminUsers").doc(uid).get(),
    ]);

    const userData = userSnap.exists ? userSnap.data() : null;
    const studentData = studentSnap.exists ? studentSnap.data() : null;
    const teacherData = teacherSnap.exists ? teacherSnap.data() : null;
    const adminData = adminSnap.exists ? adminSnap.data() : null;

    let role = typeof userData?.role === "string" ? userData.role : "";
    let active = userData?.active !== false;

    if (adminData) {
      role = typeof adminData.role === "string" ? adminData.role : role;
      active = adminData.active === true;
    } else if (teacherData) {
      role = "teacher";
      active = teacherData.active === true;
    } else if (role === "student") {
      active = true;
    }

    return NextResponse.json({
      success: true,
      uid,
      role: role || "student",
      active,
      user: userData,
      student: studentData,
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }
}
