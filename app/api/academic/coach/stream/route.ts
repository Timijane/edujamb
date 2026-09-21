import { verifyBearerToken } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAcademicAnalytics } from "@/lib/academic-analytics";
import { streamWithGemini } from "@/lib/ai/gemini-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = await verifyBearerToken(request);
    const student = await getAdminDb().collection("students").doc(token.uid).get();

    if (!student.exists) {
      return new Response(JSON.stringify({ error: "Student profile not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const message = String(body.message || "").trim();
    const previousInteractionId =
      typeof body.previousInteractionId === "string"
        ? body.previousInteractionId
        : undefined;

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: "Message is too long." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const analytics = await getAcademicAnalytics(token.uid);
    const studentData = student.data() || {};

    const systemPrompt = `
You are JAMBMASTER AI Coach, a professional AI tutor built specifically for Nigerian students preparing for JAMB.

RULES:
- Give accurate, educational, exam-focused answers.
- Explain reasoning, not just answers.
- Never invent JAMB syllabus facts, dates, policies, or admission requirements.
- If information may have changed, clearly state that it requires current verification.
- Use the student's performance when relevant.
- For calculations, show clear steps.
- For multiple-choice questions, explain the correct answer and useful elimination reasoning.
- Keep responses structured and mobile-friendly.
- Avoid unnecessary filler.
- Recommend practical JAMBMASTER study actions when appropriate.

STUDENT PROFILE:
${JSON.stringify({
  firstName: studentData.firstName || "",
  subjects: studentData.subjects || [],
  targetScore: studentData.targetScore || null,
  preferredCourse: studentData.preferredCourse || "",
  examYear: studentData.examYear || null,
})}

PERFORMANCE:
${JSON.stringify({
  totalAttempts: analytics.totalAttempts,
  totalQuestions: analytics.totalQuestions,
  totalCorrect: analytics.totalCorrect,
  accuracy: analytics.accuracy,
})}

WEAK AREAS:
${JSON.stringify(analytics.weakAreas.slice(0, 10))}

STRONG AREAS:
${JSON.stringify(analytics.strongAreas.slice(0, 10))}
`;

    const stream = await streamWithGemini(
      {
        systemPrompt,
        userPrompt: message,
        maxTokens: 1200,
      },
      previousInteractionId,
    );

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            const item = event as {
              type?: string;
              delta?: string;
              interaction?: {
                id?: string;
              };
            };

            if (
              item.type === "text_delta" &&
              typeof item.delta === "string"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "text",
                    text: item.delta,
                  })}\n\n`,
                ),
              );
            }

            if (
              item.type === "interaction_complete" &&
              item.interaction?.id
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "complete",
                    interactionId: item.interaction.id,
                  })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "AI stream failed.",
              })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unable to process Coach request.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
