import { verifyBearerToken } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAcademicAnalytics } from "@/lib/academic-analytics";
import { streamWithGemini } from "@/lib/ai/gemini-provider";
import { retrieveStudentJambKnowledge } from "@/lib/ai/jamb/jamb-retrieval";
import { resolveJambQuery } from "@/lib/ai/jamb/jamb-resolver";
import { retrieveJambResources } from "@/lib/ai/jamb/jamb-resources";
import { buildCoachFeatureContext } from "@/lib/ai/jamb/jamb-coach-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = await verifyBearerToken(request);
    const db = getAdminDb();

    const student = await db
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

    const conversationId =
      typeof body.conversationId === "string"
        ? body.conversationId.trim()
        : "";

    const clientPreviousInteractionId =
      typeof body.previousInteractionId === "string"
        ? body.previousInteractionId.trim()
        : "";

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

    let conversationRef:
      | FirebaseFirestore.DocumentReference
      | null = null;

    let storedInteractionId = "";

    if (conversationId) {
      conversationRef = db
        .collection("aiCoachConversations")
        .doc(conversationId);

      const conversationSnapshot = await conversationRef.get();

      if (!conversationSnapshot.exists) {
        return new Response(
          JSON.stringify({ error: "Conversation not found." }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const conversationData = conversationSnapshot.data() || {};

      if (conversationData.userId !== token.uid) {
        return new Response(
          JSON.stringify({ error: "Unauthorized." }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      storedInteractionId =
        typeof conversationData.interactionId === "string"
          ? conversationData.interactionId
          : "";

      await conversationRef.collection("messages").add({
        role: "user",
        content: message,
        citations: [],
        createdAt: new Date(),
        interactionId:
          storedInteractionId ||
          clientPreviousInteractionId ||
          null,
      });

      await conversationRef.update({
        lastMessage: message.slice(0, 200),
        lastRole: "user",
        updatedAt: new Date(),
      });
    }

    const previousInteractionId =
      clientPreviousInteractionId || storedInteractionId || undefined;

    const analytics = await getAcademicAnalytics(token.uid);
    const studentData = student.data() || {};

    const studentSubjects = Array.isArray(studentData.subjects)
      ? studentData.subjects
      : [];

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

    const coachFeature = await buildCoachFeatureContext(
      token.uid,
      message,
    );

    const systemPrompt = `
You are JAMBMASTER AI Coach, a professional AI tutor built specifically for Nigerian students preparing for JAMB.

CORE PURPOSE:
Help the student understand JAMB subjects, topics, questions, explanations, exam techniques and study strategies.

TEACHING METHOD:
- Act as a patient JAMB tutor, not merely a question-answering chatbot.
- When the student asks to learn a topic, identify the concept and explain the foundation in very simple language.
- Prefer clear everyday examples before complicated terminology.
- Break difficult concepts into small logical steps.
- Give worked examples when appropriate.
- Check understanding with a short question or mini-practice task when appropriate.
- When the student answers a practice question, evaluate the answer and explain the underlying concept.
- Gradually increase difficulty toward JAMB-style questions.
- When the student struggles, simplify rather than repeating the same wording.
- Do not turn every response into a quiz.
- Keep responses structured and mobile-friendly.

RULES:
- Give accurate educational exam-focused answers.
- Explain reasoning, not just answers.
- Never invent JAMB syllabus facts, dates, policies or admission requirements.
- If information may have changed, clearly state that it requires current verification.
- Use the student's performance when relevant.
- For calculations, show clear steps.
- For multiple-choice questions, explain the correct answer and useful elimination reasoning.
- Recommend practical JAMBMASTER study actions when appropriate.
- Use retrieved JAMBMASTER academic context when relevant.
- Treat approved JAMBMASTER textbook/resource material as the primary teaching reference when it directly covers the requested topic.
- Explain retrieved material simply without changing its academic meaning.
- Do not invent information absent from the retrieved academic context.
- Do not claim a question is an official JAMB question unless its category/year establishes that.
- Do not fabricate question IDs, topics, years, explanations or database records.

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
        userPrompt: [
          message,
          `COACH FEATURE: ${coachFeature.feature}`,
          "FEATURE INSTRUCTIONS:",
          coachFeature.instructions,
          "STUDENT-SPECIFIC FEATURE CONTEXT:",
          coachFeature.context,
        ].join("\n\n"),
        maxTokens: 1200,
      },
      previousInteractionId,
    );

    const encoder = new TextEncoder();

    const outputParts: string[] = [];

    const collectedCitations: Array<{
      title: string;
      url: string;
    }> = [];

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            console.log(
              "[AI COACH][GEMINI EVENT]",
              JSON.stringify(event),
            );

            const item = event as {
              event_type?: string;
              delta?: {
                type?: string;
                text?: string;
              };
              interaction?: {
                id?: string;
              };
              step?: {
                content?: Array<{
                  annotations?: Array<{
                    type?: string;
                    title?: string;
                    url?: string;
                    start_index?: number;
                    end_index?: number;
                  }>;
                }>;
              };
            };

            if (
              item.event_type === "step.delta" &&
              item.delta?.type === "text" &&
              typeof item.delta.text === "string"
            ) {
              outputParts.push(item.delta.text);

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
              item.event_type === "step.completed" &&
              Array.isArray(item.step?.content)
            ) {
              const citations = item.step.content
                .flatMap((content) =>
                  Array.isArray(content?.annotations)
                    ? content.annotations
                    : [],
                )
                .filter(
                  (annotation) =>
                    annotation?.type === "url_citation" &&
                    typeof annotation.url === "string",
                )
                .map((annotation) => ({
                  title:
                    typeof annotation.title === "string"
                      ? annotation.title
                      : annotation.url || "Source",
                  url: annotation.url as string,
                }));

              for (const citation of citations) {
                if (
                  !collectedCitations.some(
                    (existing) => existing.url === citation.url,
                  )
                ) {
                  collectedCitations.push(citation);
                }
              }

              if (citations.length) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "citations",
                      citations,
                    })}\n\n`,
                  ),
                );
              }
            }

            if (
              item.event_type === "interaction.completed" &&
              item.interaction?.id
            ) {
              const interactionId = item.interaction.id;
              const assistantContent = outputParts.join("").trim();

              if (conversationRef) {
                await conversationRef.collection("messages").add({
                  role: "assistant",
                  content: assistantContent,
                  citations: collectedCitations,
                  createdAt: new Date(),
                  interactionId,
                });

                const conversationSnapshot =
                  await conversationRef.get();

                const conversationData =
                  conversationSnapshot.data() || {};

                const currentTitle =
                  typeof conversationData.title === "string"
                    ? conversationData.title
                    : "New conversation";

                const title =
                  currentTitle === "New conversation"
                    ? message.slice(0, 60) || "New conversation"
                    : currentTitle;

                await conversationRef.update({
                  title,
                  interactionId,
                  lastMessage: assistantContent.slice(0, 200),
                  lastRole: "assistant",
                  updatedAt: new Date(),
                });
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "complete",
                    interactionId,
                  })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(
            encoder.encode("data: [DONE]\n\n"),
          );

          controller.close();
        } catch (error) {
          console.error("Coach stream error:", error);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "AI Coach stream failed.",
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
      },
    });
  } catch (error) {
    console.error("Coach stream request error:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unable to start AI Coach.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
