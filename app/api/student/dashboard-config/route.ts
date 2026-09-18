import { NextRequest, NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import {
  defaultStudentDashboardConfig,
  normalizeStudentDashboardConfig,
} from "@/lib/student-dashboard-config";

export async function GET(request: NextRequest) {
  try {
    await verifyBearerToken(request);

    const db = getAdminDb();

    const snapshot = await db
      .collection("studentDashboardConfig")
      .doc("main")
      .get();

    if (!snapshot.exists) {
      return NextResponse.json({
        success: true,
        config: {
          ...defaultStudentDashboardConfig,
          status: "published",
        },
      });
    }

    const data = snapshot.data() ?? {};

    if (data.status !== "published") {
      return NextResponse.json({
        success: true,
        config: {
          ...defaultStudentDashboardConfig,
          status: "published",
        },
      });
    }

    return NextResponse.json({
      success: true,
      config: normalizeStudentDashboardConfig(data),
    });
  } catch (error) {
    console.error(
      "Failed to load student dashboard configuration:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load dashboard configuration.",
      },
      { status: 500 }
    );
  }
}
