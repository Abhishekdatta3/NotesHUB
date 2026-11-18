import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
  "what", "which", "who", "whom", "this", "that", "these", "those",
  "is", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should", "can",
  "may", "might", "of", "in", "on", "at", "to", "for", "with", "about",
  "from", "by", "as", "it", "its", "not", "explain", "tell", "me", "how",
  "why", "i", "you", "we", "they", "he", "she", "there", "their",
  "please", "help", "understand", "notes", "note", "question",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function scoreChunk(chunk, queryTokens) {
  if (queryTokens.length === 0) return 0;

  const chunkTokens = tokenize(chunk);
  if (chunkTokens.length === 0) return 0;

  const counts = new Map();
  for (const token of chunkTokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  let score = 0;
  for (const token of queryTokens) {
    score += counts.get(token) ?? 0;
  }

  return score / Math.sqrt(chunkTokens.length);
}

function chunkText(text, target = 1200) {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const para = paragraph.trim();
    if (!para) continue;

    if (para.length > target * 2) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < para.length; i += target) {
        chunks.push(para.slice(i, i + target));
      }
      continue;
    }

    if ((current + "\n\n" + para).length > target) {
      if (current) chunks.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function buildContext(question, rows, topK = 6) {
  const queryTokens = tokenize(question);
  const matches = [];

  for (const row of rows) {
    if (!row.extracted_text) continue;

    for (const chunk of chunkText(row.extracted_text)) {
      const score = scoreChunk(chunk, queryTokens);
      if (score > 0) {
        matches.push({
          title: row.title,
          subjectName: row.subject_name,
          subjectCode: row.subject_code,
          semester: row.semester,
          text: chunk,
          score,
        });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, topK);

  if (top.length === 0) {
    return { text: "", citations: [] };
  }

  const text = top
    .map(
      (item, index) =>
        `[${index + 1}] From "${item.title ?? "Untitled"}" ` +
        `(${item.subjectName ?? "Unknown subject"}, ` +
        `${item.subjectCode ?? "No code"}, Semester ${item.semester ?? "unknown"}):\n` +
        item.text,
    )
    .join("\n\n---\n\n");

  const citations = top.map((item) => ({
    title: item.title,
    subjectName: item.subjectName,
    subjectCode: item.subjectCode,
    semester: item.semester,
    snippet: item.text.slice(0, 300),
  }));

  return { text, citations };
}

async function callGemini(question, context, history) {
  const apiKey =
    Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY");

  if (!apiKey) {
    return {
      answer: null,
      error: "GEMINI_API_KEY is not configured for this Edge Function.",
    };
  }

  const contents = [];

  for (const message of history.slice(-6)) {
    const role = message.role === "assistant" ? "model" : "user";
    const previous = contents[contents.length - 1];

    // Gemini requires alternating user and model messages.
    if (previous?.role === role) {
      previous.parts[0].text += `\n\n${message.content}`;
    } else {
      contents.push({
        role,
        parts: [{ text: message.content }],
      });
    }
  }

  // Avoid consecutive user messages in Gemini history.
  if (contents.at(-1)?.role === "user") {
    contents.pop();
  }

  contents.push({
    role: "user",
    parts: [{
      text:
        `Question: ${question}\n\n` +
        `Uploaded notes context:\n${context || "No matching note passages were found."}`,
    }],
  });

  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
  const errors = [];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text:
                  "You are a patient study tutor for university students. " +
                  "Answer using only the uploaded notes context. Cite claims " +
                  "from the notes with bracketed source numbers, such as [1]. " +
                  "If the notes do not contain enough information, say so clearly " +
                  "and do not invent an answer. Explain concepts clearly.",
              }],
            },
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        errors.push(
          `${model} (${response.status}): ${
            data?.error?.message ?? "Gemini request failed"
          }`,
        );
        continue;
      }

      const answer = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

      if (answer) return { answer, error: null };
      errors.push(`${model}: Gemini returned no text.`);
    } catch (error) {
      errors.push(
        `${model}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { answer: null, error: errors.join(" | ") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const jsonHeaders = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const body = await req.json().catch(() => null);
    const question =
      typeof body?.question === "string" ? body.question.trim() : "";
    const sessionId =
      typeof body?.sessionId === "string" ? body.sessionId : "";

    const history = Array.isArray(body?.history)
      ? body.history
          .filter(
            (message) =>
              message &&
              typeof message === "object" &&
              ["user", "assistant"].includes(message.role) &&
              typeof message.content === "string" &&
              message.content.length < 4000,
          )
          .slice(-6)
          .map((message) => ({
            role: message.role,
            content: message.content,
          }))
      : [];

    if (!question || question.length > 2000) {
      return new Response(
        JSON.stringify({
          error: "Please provide a question (max 2000 characters).",
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment variables.");
      return new Response(
        JSON.stringify({ error: "Server configuration is incomplete." }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: rows, error: dbError } = await supabase
      .from("notes")
      .select(
        "id, title, subject_name, subject_code, semester, uploaded_by, extracted_text",
      )
      .not("extracted_text", "is", null)
      .limit(500);

    if (dbError) {
      console.error("Notes query failed:", dbError);
      return new Response(
        JSON.stringify({ error: "Could not search the notes." }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const { text: context, citations } = buildContext(question, rows ?? []);
    const result = await callGemini(question, context, history);

    const answer =
      result.answer ??
      (context
        ? "Gemini could not generate a response right now. Please try again shortly."
        : "I couldn't find matching information in the uploaded notes. Try asking about a specific topic or using terms from your notes.");

    if (sessionId) {
      const { error: insertError } = await supabase
        .from("chat_messages")
        .insert([
          { session_id: sessionId, role: "user", content: question },
          {
            session_id: sessionId,
            role: "assistant",
            content: answer,
            citations,
          },
        ]);

      if (insertError) {
        console.error("Chat message insert failed:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        answer,
        citations,
        usedNotes: citations.length > 0,
        llm: Boolean(result.answer),
        providerConfigured: Boolean(
          Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY"),
        ),
        providerErrors: result.error ? [result.error] : [],
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error("Chat function error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      }),
      { status: 500, headers: jsonHeaders },
    );
  }
});