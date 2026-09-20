import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import {
  getPublishedQuestions,
  saveAcademicAttempt,
  getStudentPerformance,
  getStudentWeakAreas,
  type PracticeMode,
  type AttemptAnswer,
} from "@/lib/academic-engine";

export const runtime = "nodejs";

const MODES: PracticeMode[] = [
  "cbt",
  "past_questions",
  "mock",
  "battle",
];

async function requireStudent(request: Request) {
  const token = await verifyBearerToken(request);

  const db = getAdminDb();

  const student = await db
    .collection("students")
    .doc(token.uid)
    .get();

  if (!student.exists) {
    throw new Error("Student profile not found.");
  }

  return token;
}

function sanitizeQuestion(question: Record<string, unknown>) {
  const {
    correctOption,
    explanation,
    explanationContent,
    ...safeQuestion
  } = question;

  return safeQuestion;
}

export async function POST(request: Request) {
  try {
    const token = await requireStudent(request);
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "questions") {
      const mode = String(body.mode || "cbt") as PracticeMode;

      if (!MODES.includes(mode)) {
        return NextResponse.json(
          { error: "Invalid practice mode." },
          { status: 400 },
        );
      }

      const questions = await getPublishedQuestions({
        subjectId:
          String(body.subjectId || "").trim() || undefined,
        topicId:
          String(body.topicId || "").trim() || undefined,
        year:
          body.year !== undefined && body.year !== ""
            ? Number(body.year)
            : undefined,
        category:
          String(body.category || "").trim() || undefined,
        difficulty:
          String(body.difficulty || "").trim() || undefined,
        limit: Number(body.limit) || 20,
      });

      return NextResponse.json({
        mode,
        questions: questions.map((question) =>
          sanitizeQuestion(
            question as Record<string, unknown>,
          ),
        ),
      });
    }

    if (action === "submit") {
      const mode = String(body.mode || "cbt") as PracticeMode;

      if (!MODES.includes(mode)) {
        return NextResponse.json(
          { error: "Invalid practice mode." },
          { status: 400 },
        );
      }

      if (!Array.isArray(body.answers)) {
        return NextResponse.json(
          { error: "Answers are required." },
          { status: 400 },
        );
      }

      const db = getAdminDb();
      const answers: AttemptAnswer[] = [];

      for (const raw of body.answers) {
        const questionId = String(
          raw?.questionId || "",
        ).trim();

        const selectedOption = Number(
          raw?.selectedOption,
        );

        const timeSpentSeconds = Number(
          raw?.timeSpentSeconds || 0,
        );

        if (!questionId) continue;

        if (
          !Number.isInteger(selectedOption) ||
          selectedOption < 0 ||
          selectedOption > 3
        ) {
          continue;
        }

        const question = await db
          .collection("academicQuestions")
          .doc(questionId)
          .get();

        if (!question.exists) continue;

        const data = question.data();

        if (
          data?.active !== true ||
          data?.published !== true
        ) {
          continue;
        }

        answers.push({
          questionId,
          selectedOption,
          correct:
            Number(data.correctOption) === selectedOption,
          timeSpentSeconds:
            Number.isFinite(timeSpentSeconds) &&
            timeSpentSeconds >= 0
              ? Math.round(timeSpentSeconds)
              : 0,
        });
      }

      if (!answers.length) {
        return NextResponse.json(
          { error: "No valid answers were submitted." },
          { status: 400 },
        );
      }

      const subjectIds = Array.isArray(body.subjectIds)
        ? body.subjectIds.map(String).filter(Boolean)
        : [];

      const questionIds = answers.map(
        (answer) => answer.questionId,
      );

      const result = await saveAcademicAttempt({
        userId: token.uid,
        mode,
        subjectIds,
        questionIds,
        answers,
        startedAt: body.startedAt || undefined,
        completedAt: body.completedAt || undefined,
      });

      return NextResponse.json({
        success: true,
        result,
      });
    }

    if (action === "performance") {
      const performance =
        await getStudentPerformance(token.uid);

      return NextResponse.json({
        performance,
      });
    }

    if (action === "weak-areas") {
      const weakAreas =
        await getStudentWeakAreas(token.uid);

      return NextResponse.json({
        weakAreas,
      });
    }

    return NextResponse.json(
      { error: "Unknown engine action." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Academic engine request failed.",
      },
      { status: 400 },
    );
  }
}
