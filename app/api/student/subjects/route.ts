import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = await verifyBearerToken(request);
    const db = getAdminDb();

    const studentSnap = await db
      .collection("students")
      .doc(token.uid)
      .get();

    if (!studentSnap.exists) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 }
      );
    }

    const student = studentSnap.data() || {};
    const selectedSubjects = Array.isArray(student.subjects)
      ? student.subjects
      : [];

    if (!selectedSubjects.length) {
      return NextResponse.json({ subjects: [] });
    }

    const subjectSnapshot = await db
      .collection("academicSubjects")
      .where("active", "==", true)
      .where("published", "==", true)
      .get();

    const subjects = [];

    for (const doc of subjectSnapshot.docs) {
      const subject = doc.data();

      if (!selectedSubjects.includes(subject.name)) {
        continue;
      }

      const topicSnapshot = await db
        .collection("academicTopics")
        .where("subjectId", "==", doc.id)
        .where("active", "==", true)
        .where("published", "==", true)
        .get();

      const topics = topicSnapshot.docs
        .map((topicDoc) => {
          const data = topicDoc.data();

          return {
            id: topicDoc.id,
            title: typeof data.title === "string" ? data.title : "",
            description:
              typeof data.description === "string" ? data.description : "",
            order: typeof data.order === "number" ? data.order : 0,
            active: data.active === true,
            published: data.published === true,
            subjectId:
              typeof data.subjectId === "string" ? data.subjectId : doc.id,
          };
        })
        .sort((a, b) => a.order - b.order);

      subjects.push({
        id: doc.id,
        name: subject.name,
        slug: subject.slug,
        code: subject.code,
        description: subject.description || "",
        image: typeof subject.image === "string" ? subject.image : "",
        imageMediaId:
          typeof subject.imageMediaId === "string"
            ? subject.imageMediaId
            : "",
        topics,
      });
    }

    subjects.sort(
      (a, b) =>
        Number(
          subjectSnapshot.docs.find(
            (doc) => doc.id === a.id
          )?.data().order ?? 0
        ) -
        Number(
          subjectSnapshot.docs.find(
            (doc) => doc.id === b.id
          )?.data().order ?? 0
        )
    );

    return NextResponse.json({ subjects });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load subjects.",
      },
      { status: 401 }
    );
  }
}
