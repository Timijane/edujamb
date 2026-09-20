import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import { getPublishedQuestions } from "@/lib/academic-engine";

export const runtime = "nodejs";

async function requireStudent(request: Request) {
  const token = await verifyBearerToken(request);

  const student = await getAdminDb()
    .collection("students")
    .doc(token.uid)
    .get();

  if (!student.exists) {
    throw new Error("Student profile not found.");
  }

  return token;
}

export async function POST(request: Request) {
  try {
    const token = await requireStudent(request);
    const body = await request.json();
    const action = String(body.action || "");

    const db = getAdminDb();

    if (action === "create") {
      const subjectId = String(
        body.subjectId || "",
      ).trim();

      const questionCount = Math.min(
        Math.max(Number(body.questionCount) || 10, 5),
        20,
      );

      if (!subjectId) {
        return NextResponse.json(
          { error: "Subject is required." },
          { status: 400 },
        );
      }

      const questions = await getPublishedQuestions({
        subjectId,
        limit: questionCount,
      });

      if (questions.length < questionCount) {
        return NextResponse.json(
          {
            error:
              "There are not enough published questions for this battle.",
          },
          { status: 400 },
        );
      }

      const battleRef = db
        .collection("academicBattles")
        .doc();

      await battleRef.set({
        hostId: token.uid,
        participantIds: [token.uid],
        subjectId,
        questionIds: questions.map(
          (question) => question.id,
        ),
        questionCount,
        status: "waiting",
        answers: {},
        scores: {},
        createdAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        battleId: battleRef.id,
      });
    }

    if (action === "join") {
      const battleId = String(
        body.battleId || "",
      ).trim();

      if (!battleId) {
        return NextResponse.json(
          { error: "Battle ID is required." },
          { status: 400 },
        );
      }

      const battleRef = db
        .collection("academicBattles")
        .doc(battleId);

      const battle = await battleRef.get();

      if (!battle.exists) {
        return NextResponse.json(
          { error: "Battle not found." },
          { status: 404 },
        );
      }

      const data = battle.data() || {};
      const participants = Array.isArray(
        data.participantIds,
      )
        ? data.participantIds
        : [];

      if (participants.includes(token.uid)) {
        return NextResponse.json({
          success: true,
          battleId,
        });
      }

      if (participants.length >= 20) {
        return NextResponse.json(
          { error: "This battle is full." },
          { status: 400 },
        );
      }

      await battleRef.update({
        participantIds:
          FieldValue.arrayUnion(token.uid),
        updatedAt:
          FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        battleId,
      });
    }

    if (action === "start") {
      const battleId = String(
        body.battleId || "",
      ).trim();

      if (!battleId) {
        return NextResponse.json(
          { error: "Battle ID is required." },
          { status: 400 },
        );
      }

      const battleRef = db
        .collection("academicBattles")
        .doc(battleId);

      const battle = await battleRef.get();

      if (!battle.exists) {
        return NextResponse.json(
          { error: "Battle not found." },
          { status: 404 },
        );
      }

      const data = battle.data() || {};
      const participants = Array.isArray(
        data.participantIds,
      )
        ? data.participantIds
        : [];

      if (!participants.includes(token.uid)) {
        return NextResponse.json(
          { error: "You are not part of this battle." },
          { status: 403 },
        );
      }

      await battleRef.update({
        status: "active",
        startedAt:
          data.startedAt ||
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        battleId,
      });
    }

    if (action === "submit") {
      const battleId = String(
        body.battleId || "",
      ).trim();

      if (!battleId) {
        return NextResponse.json(
          { error: "Battle ID is required." },
          { status: 400 },
        );
      }

      if (!Array.isArray(body.answers)) {
        return NextResponse.json(
          { error: "Answers are required." },
          { status: 400 },
        );
      }

      const battleRef = db
        .collection("academicBattles")
        .doc(battleId);

      const battle = await battleRef.get();

      if (!battle.exists) {
        return NextResponse.json(
          { error: "Battle not found." },
          { status: 404 },
        );
      }

      const data = battle.data() || {};
      const participants = Array.isArray(
        data.participantIds,
      )
        ? data.participantIds
        : [];

      if (!participants.includes(token.uid)) {
        return NextResponse.json(
          { error: "You are not part of this battle." },
          { status: 403 },
        );
      }

      const questionIds = Array.isArray(
        data.questionIds,
      )
        ? data.questionIds
        : [];

      let score = 0;
      const safeAnswers: Record<
        string,
        number
      > = {};

      for (const raw of body.answers) {
        const questionId = String(
          raw?.questionId || "",
        ).trim();

        const selectedOption = Number(
          raw?.selectedOption,
        );

        if (!questionId) continue;

        if (
          !questionIds.includes(questionId) ||
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

        const questionData =
          question.data() || {};

        if (
          questionData.active !== true ||
          questionData.published !== true
        ) {
          continue;
        }

        safeAnswers[questionId] =
          selectedOption;

        if (
          Number(
            questionData.correctOption,
          ) === selectedOption
        ) {
          score += 1;
        }
      }

      await battleRef.update({
        [`answers.${token.uid}`]: safeAnswers,
        [`scores.${token.uid}`]: score,
        updatedAt:
          FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        score,
        totalQuestions: questionIds.length,
      });
    }

    if (action === "get") {
      const battleId = String(
        body.battleId || "",
      ).trim();

      if (!battleId) {
        return NextResponse.json(
          { error: "Battle ID is required." },
          { status: 400 },
        );
      }

      const battle = await db
        .collection("academicBattles")
        .doc(battleId)
        .get();

      if (!battle.exists) {
        return NextResponse.json(
          { error: "Battle not found." },
          { status: 404 },
        );
      }

      const data = battle.data() || {};
      const participants = Array.isArray(
        data.participantIds,
      )
        ? data.participantIds
        : [];

      if (!participants.includes(token.uid)) {
        return NextResponse.json(
          { error: "You are not part of this battle." },
          { status: 403 },
        );
      }

      const questionIds = Array.isArray(
        data.questionIds,
      )
        ? data.questionIds
        : [];

      const questions = [];

      for (const questionId of questionIds) {
        const question = await db
          .collection("academicQuestions")
          .doc(String(questionId))
          .get();

        if (!question.exists) continue;

        const questionData =
          question.data() || {};

        questions.push({
          id: question.id,
          subjectId: questionData.subjectId,
          topicId: questionData.topicId,
          question: questionData.question,
          questionContent:
            questionData.questionContent || [],
          options: questionData.options || [],
          optionContent:
            questionData.optionContent || [],
          imageUrl:
            questionData.imageUrl || "",
        });
      }

      return NextResponse.json({
        battle: {
          id: battle.id,
          hostId: data.hostId,
          participantIds:
            data.participantIds || [],
          subjectId: data.subjectId,
          questionCount:
            data.questionCount ||
            questions.length,
          status: data.status || "waiting",
          scores: data.scores || {},
        },
        questions,
      });
    }

    return NextResponse.json(
      { error: "Unknown battle action." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Battle request failed.",
      },
      { status: 400 },
    );
  }
}
