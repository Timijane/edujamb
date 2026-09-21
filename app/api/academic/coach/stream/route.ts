import { verifyBearerToken } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAcademicAnalytics } from "@/lib/academic-analytics";
import { streamWithGemini } from "@/lib/ai/gemini-provider";
import { retrieveStudentJambKnowledge } from "@/lib/ai/jamb/jamb-retrieval";
import { resolveJambQuery } from "@/lib/ai/jamb/jamb-resolver";
import { retrieveJambResources } from "@/lib/ai/jamb/jamb-resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = await verifyBearerToken(request);

    const student = await getAdminDb()
      .collection("students")
      .doc(token.uid)
      .get();

    if (!student.exists) {
      return new Response(
        JSON.stringify({ error: "Student profile not found." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body = await request.json();

    const message = String(body.message || "").trim();

    const previousInteractionId =
      typeof body.previousInteractionId === "string"
        ? body.previousInteractionId
        : undefined;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message is too long." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const analytics = await getAcademicAnalytics(token.uid);
    const studentData = student.data() || {};

    const studentSubjects = Array.isArray(studentData.subjects)
      ? studentData.subjects
      : [];

    /*
     * Retrieve relevant JAMBMASTER academic knowledge.
     *
     * This is intentionally server-side. Gemini never receives the
     * entire Firestore database; it receives only the relevant context.
     */
    const resolvedJambQuery = await resolveJambQuery(message);

    const jambKnowledge = await retrieveStudentJambKnowledge(token.uid, {
      query: message,
      subjectId: resolvedJambQuery.subjectId,
      topicId: resolvedJambQuery.topicId,
      limit: 8,
    });
    
    const jambResources = await retrieveJambResources(message, {
      subjectId: resolvedJambQuery.subjectId,
      topicId: resolvedJambQuery.topicId,
      limit: 6,
    });

    const systemPrompt = `
You are JAMBMASTER AI Coach, a professional AI tutor built specifically for Nigerian students preparing for JAMB.

CORE PURPOSE:
Help the student understand JAMB subjects, topics, questions, explanations, exam techniques and study strategies.

TEACHING METHOD:
- Act as a patient JAMB tutor, not merely a question-answering chatbot.
- When the student asks to learn a topic, first identify the concept and explain the foundation in very simple language.
- Prefer clear everyday examples before introducing complicated terminology.
- Break difficult concepts into small logical steps.
- After explaining an important concept, give a worked example when appropriate.
- Check understanding with a short question or mini-practice task when appropriate.
- When the student answers a practice question, evaluate the answer, explain why it is correct or incorrect, and teach the underlying concept.
- If the student understands the basics, gradually increase the difficulty toward JAMB-style questions.
- When the student is struggling, simplify the explanation rather than simply repeating the same wording.
- Connect related concepts when that improves understanding, but stay focused on the student's actual question.
- For exam preparation, distinguish between learning the concept and applying it under timed JAMB conditions.
- Do not turn every response into a quiz; use judgment based on the student's request and conversation context.

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
- When relevant JAMBMASTER academic context is provided below, use it as a trusted source.
- Treat approved JAMBMASTER textbook/resource material as the primary teaching reference when it directly covers the student's requested topic.
- Explain the retrieved material in simple language without changing its academic meaning.
- You may combine retrieved JAMBMASTER resources with the student's academic records, performance data and retrieved questions when useful.
- Do not invent information that is absent from the retrieved academic context.
- If the retrieved resource material conflicts with a clearly established academic fact, explain the conflict rather than silently presenting both as equally authoritative.
- Do not claim that a retrieved question is an official JAMB question unless its category/year identifies it as such.
- Do not fabricate question IDs, topics, years, explanations or database records.
- If the retrieved context does not contain enough information to answer a database-specific question, say so instead of inventing it.

STUDENT PROFILE:
${JSON.stringify({
  firstName: studentData.firstName || "",
  subjects: studentSubjects,
  targetScore: studentData.targetScore || null,
  preferredCourse: studentData.preferredCourse || "",
  preferredInstitution: studentData.preferredInstitution || "",
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

JAMBMASTER ACADEMIC RETRIEVAL CONTEXT:
${jambKnowledge.context || "No directly relevant JAMBMASTER academic records were retrieved for this request."}

RETRIEVAL SUMMARY:
${JSON.stringify({
  intent: resolvedJambQuery.intent,
  subject: resolvedJambQuery.subjectName || null,
  topic: resolvedJambQuery.topicTitle || null,
  topicsRetrieved: jambKnowledge.topics.length,
  questionsRetrieved: jambKnowledge.questions.length,
  resourceChunksRetrieved: jambResources.chunks.length,
})}

JAMBMASTER TEXTBOOK / RESOURCE MATERIAL:
${jambResources.context || "No directly relevant textbook or approved resource material was retrieved for this request."}

IMPORTANT:
The retrieval context is supporting academic evidence. Use it when relevant, but do not blindly force it into every answer.
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
              event_type?: string;
              delta?: {
                type?: string;
                text?: string;
              };
              interaction?: {
                id?: string;
              };
            };

            if (
              item.event_type === "step.delta" &&
              item.delta?.type === "text" &&
              typeof item.delta.text === "string"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "text",
                    text: item.delta.text,
                  })}\n\n`,
                ),
              );
            }

            if (
              item.event_type === "interaction.completed" &&
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
