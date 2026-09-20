import { NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAcademicAnalytics } from "@/lib/academic-analytics";
import { generateAIResponse } from "@/lib/ai/ai-router";

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

    const message = String(
      body.message || "",
    ).trim();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message is too long." },
        { status: 400 },
      );
    }

    const analytics =
      await getAcademicAnalytics(token.uid);

    const weakAreas = analytics.weakAreas
      .slice(0, 10)
      .map((item) => ({
        topicId: item.topicId,
        accuracy: item.accuracy,
        questions: item.questions,
      }));

    const strongAreas = analytics.strongAreas
      .slice(0, 10)
      .map((item) => ({
        topicId: item.topicId,
        accuracy: item.accuracy,
        questions: item.questions,
      }));

    const coachContext = {
      studentId: token.uid,
      performance: {
        totalAttempts: analytics.totalAttempts,
        totalQuestions: analytics.totalQuestions,
        totalCorrect: analytics.totalCorrect,
        accuracy: analytics.accuracy,
      },
      weakAreas,
      strongAreas,
    };

    const aiResponse = await generateAIResponse({
      systemPrompt: `You are the AI JAMB Coach for JAMBMASTER.

Your role is to help Nigerian students prepare for JAMB professionally.

Give clear, accurate, educational answers.
Do not invent JAMB syllabus facts.
When the student asks about their performance, use the supplied performance data.
Encourage practical study actions.
If the student asks an academic question, explain the reasoning instead of only giving an answer.
Keep responses concise but useful.

Student performance:
${JSON.stringify(coachContext)}`,
      userPrompt: message,
      maxTokens: 1200,
    });

    return NextResponse.json({
      success: true,
      coachContext,
      response: aiResponse.text,
      provider: aiResponse.provider,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process Coach request.",
      },
      { status: 400 },
    );
  }
}
