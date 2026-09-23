import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = await verifyBearerToken(request);

    if (!token?.uid) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const student = await getAdminDb()
      .collection("students")
      .doc(token.uid)
      .get();

    if (!student.exists) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 403 }
      );
    }

    const snapshot = await getAdminDb()
      .collection("academicSubjects")
      .where("active", "==", true)
      .where("published", "==", true)
      .orderBy("order", "asc")
      .get();

    const subjects = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name || "",
        code: data.code || "",
        description: data.description || "",
        image: data.image || "",
        imageMediaId: data.imageMediaId || "",
      };
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("[ACADEMIC SUBJECTS]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
