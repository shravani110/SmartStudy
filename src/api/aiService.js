const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL?.trim();
const AI_API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY?.trim();
const REQUIRED_KEYS = ["simplified_notes", "key_takeaways", "flashcards"];
const IS_GEMINI_API = AI_API_URL?.includes("generativelanguage.googleapis.com");

const STOPWORDS = new Set([
  "the",
  "and",
  "that",
  "with",
  "from",
  "this",
  "have",
  "your",
  "into",
  "about",
  "there",
  "their",
  "which",
  "these",
  "those",
  "because",
  "while",
  "where",
  "when",
  "what",
  "were",
  "been",
  "being",
  "will",
  "would",
  "could",
  "should",
  "them",
  "they",
  "then",
  "than",
  "also",
  "some",
  "each",
  "other",
  "more",
  "most",
  "such",
  "very",
]);

function buildPrompt(userInput) {
  return `Analyze the following text. Return ONLY a valid JSON object with three keys: 'simplified_notes' (a 2-paragraph summary in simple language), 'key_takeaways' (an array of 5 bullet points), and 'flashcards' (an array of objects, each with a 'question' and 'answer'). Every flashcard question must be a real study question about the topic, not a label like "Key point 1" or "Step 2". The text is: ${userInput}`;
}

function hasStudyGuideShape(value) {
  return (
    value &&
    typeof value === "object" &&
    REQUIRED_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function stripCodeFences(value) {
  return value.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonFromString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = stripCodeFences(value);
  const direct = tryParseJson(cleaned);

  if (direct) {
    return direct;
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return tryParseJson(cleaned.slice(firstBrace, lastBrace + 1));
}

function findStudyGuidePayload(value) {
  if (!value) {
    return null;
  }

  if (hasStudyGuideShape(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = extractJsonFromString(value);
    return parsed ? findStudyGuidePayload(parsed) : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStudyGuidePayload(item);
      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    if (Array.isArray(value.choices)) {
      for (const choice of value.choices) {
        const found =
          findStudyGuidePayload(choice?.message?.content) ||
          findStudyGuidePayload(choice?.text) ||
          findStudyGuidePayload(choice?.content);

        if (found) {
          return found;
        }
      }
    }

    for (const nestedValue of Object.values(value)) {
      const found = findStudyGuidePayload(nestedValue);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function splitIntoSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
}

function cleanSentence(sentence) {
  return sentence.replace(/\s+/g, " ").trim();
}

function getTopicLabel(sentence) {
  const candidates = sentence
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

  return candidates.slice(0, 3).join(" ") || "this topic";
}

function makeTopicName(sourceText) {
  const firstUsefulLine = sourceText
    .split("\n")
    .map((line) => cleanSentence(line))
    .find((line) => line.length > 2);

  if (!firstUsefulLine) {
    return "this topic";
  }

  const definitionStart = firstUsefulLine.search(
    /\b(is a|is an|is the|refers to|means|defined as|works by|helps|allows|includes|consists of)\b/i
  );

  const baseText =
    definitionStart > 0 ? firstUsefulLine.slice(0, definitionStart) : firstUsefulLine;
  const cleanedTopic = baseText
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedTopic) {
    return getTopicLabel(firstUsefulLine);
  }

  return cleanedTopic.split(/\s+/).slice(0, 5).join(" ");
}

function trimAnswer(text) {
  const cleaned = cleanSentence(text);
  return cleaned.length > 180 ? `${cleaned.slice(0, 177).trim()}...` : cleaned;
}

function makeQuestionFromSentence(sentence, topicName, category, index) {
  const lower = sentence.toLowerCase();

  if (category === "definitions") {
    return `What is ${topicName}?`;
  }

  if (
    lower.includes("used for") ||
    lower.includes("helps") ||
    lower.includes("allows") ||
    lower.includes("used to")
  ) {
    return `What is ${topicName} used for?`;
  }

  if (
    lower.includes("important") ||
    lower.includes("benefit") ||
    lower.includes("advantage")
  ) {
    return `Why is ${topicName} important?`;
  }

  if (
    lower.includes("example") ||
    lower.includes("for instance") ||
    lower.includes("such as") ||
    lower.includes("like ")
  ) {
    return `What is an example of ${topicName}?`;
  }

  if (
    lower.includes("works by") ||
    lower.includes("process") ||
    lower.includes("step") ||
    lower.includes("first") ||
    lower.includes("then") ||
    lower.includes("finally")
  ) {
    return index === 0
      ? `How does ${topicName} work?`
      : `What happens next in ${topicName}?`;
  }

  if (lower.includes("types")) {
    return `What are the types of ${topicName}?`;
  }

  if (lower.includes("includes") || lower.includes("consists of")) {
    return `What does ${topicName} include?`;
  }

  if (lower.includes("difference") || lower.includes("compared")) {
    return `How is ${topicName} different?`;
  }

  return `What is one key fact about ${topicName}?`;
}

function dedupeQuestion(question, topicName, usedQuestions) {
  if (!usedQuestions.has(question)) {
    usedQuestions.add(question);
    return question;
  }

  const fallbackQuestion = `What is another important point about ${topicName}?`;

  if (!usedQuestions.has(fallbackQuestion)) {
    usedQuestions.add(fallbackQuestion);
    return fallbackQuestion;
  }

  const numberedQuestion = `${fallbackQuestion} (${usedQuestions.size + 1})`;
  usedQuestions.add(numberedQuestion);
  return numberedQuestion;
}

function buildFlashcardsFromGroupedContent(groupedContent, topicName) {
  const flashcards = [];
  const usedQuestions = new Set();
  const groupsInOrder = [
    ["definitions", groupedContent.definitions],
    ["processes", groupedContent.processes],
    ["examples", groupedContent.examples],
    ["benefits", groupedContent.benefits],
    ["details", groupedContent.details],
  ];

  groupsInOrder.forEach(([category, sentences]) => {
    sentences.forEach((sentence, index) => {
      if (flashcards.length >= 6) {
        return;
      }

      const question = dedupeQuestion(
        makeQuestionFromSentence(sentence, topicName, category, index),
        topicName,
        usedQuestions
      );

      flashcards.push({
        question,
        answer: trimAnswer(sentence),
      });
    });
  });

  return flashcards;
}

export function hasLegacyFlashcards(flashcards) {
  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    return true;
  }

  return flashcards.some((card) =>
    /^(what is this topic about\?|key point \d+:?|step \d+: what happens\?|what should i know\?)$/i.test(
      String(card?.question ?? "").trim()
    )
  );
}

export function buildFlashcardsFromText(sourceText) {
  const sentences = splitIntoSentences(sourceText);
  const fallbackSentences = sentences.length > 0 ? sentences : [cleanSentence(sourceText)];
  const groupedContent = {
    definitions: [],
    processes: [],
    examples: [],
    benefits: [],
    details: [],
  };

  fallbackSentences.forEach((sentence) => {
    const lower = sentence.toLowerCase();
    if (
      lower.includes("is a") ||
      lower.includes("refers to") ||
      lower.includes("means") ||
      lower.includes("defined as")
    ) {
      groupedContent.definitions.push(cleanSentence(sentence));
    } else if (
      lower.includes("step") ||
      lower.includes("process") ||
      lower.includes("how") ||
      lower.includes("works by") ||
      lower.includes("first") ||
      lower.includes("then") ||
      lower.includes("finally")
    ) {
      groupedContent.processes.push(cleanSentence(sentence));
    } else if (
      lower.includes("example") ||
      lower.includes("such as") ||
      lower.includes("like") ||
      lower.includes("for instance")
    ) {
      groupedContent.examples.push(cleanSentence(sentence));
    } else if (
      lower.includes("benefit") ||
      lower.includes("advantage") ||
      lower.includes("important") ||
      lower.includes("helps") ||
      lower.includes("allows")
    ) {
      groupedContent.benefits.push(cleanSentence(sentence));
    } else {
      groupedContent.details.push(cleanSentence(sentence));
    }
  });

  const topicName = makeTopicName(sourceText);
  const flashcards = buildFlashcardsFromGroupedContent(groupedContent, topicName);

  return flashcards.length > 0
    ? flashcards
    : [
        {
          question: `What is ${topicName}?`,
          answer: trimAnswer(sourceText),
        },
      ];
}

function buildLocalStudyGuide(sourceText) {
  const sentences = splitIntoSentences(sourceText);
  const fallbackSentences = sentences.length > 0 ? sentences : [cleanSentence(sourceText)];

  // Group sentences by theme/pattern to understand the content structure
  const groupedContent = {
    definitions: [],
    processes: [],
    examples: [],
    benefits: [],
    details: []
  };

  fallbackSentences.forEach(sentence => {
    const lower = sentence.toLowerCase();
    if (lower.includes("is a") || lower.includes("refers to") || lower.includes("means") || lower.includes("defined as")) {
      groupedContent.definitions.push(cleanSentence(sentence));
    } else if (lower.includes("step") || lower.includes("process") || lower.includes("how") || lower.includes("works by") || lower.includes("first") || lower.includes("then") || lower.includes("finally")) {
      groupedContent.processes.push(cleanSentence(sentence));
    } else if (lower.includes("example") || lower.includes("such as") || lower.includes("like") || lower.includes("for instance")) {
      groupedContent.examples.push(cleanSentence(sentence));
    } else if (lower.includes("benefit") || lower.includes("advantage") || lower.includes("important") || lower.includes("helps") || lower.includes("allows")) {
      groupedContent.benefits.push(cleanSentence(sentence));
    } else {
      groupedContent.details.push(cleanSentence(sentence));
    }
  });

  // Build simplified notes - plain paragraphs without section headers
  let simplifiedNotes = "";

  // Collect all content into simplified paragraphs
  const allSentences = [];

  // Add definitions (simplified)
  if (groupedContent.definitions.length > 0) {
    const def = groupedContent.definitions[0];
    allSentences.push(def.length > 150 ? def.substring(0, 150) + "..." : def);
  }

  // Add process steps as sentences
  groupedContent.processes.slice(0, 3).forEach((step) => {
    allSentences.push(step.length > 150 ? step.substring(0, 150) + "..." : step);
  });

  // Add remaining details
  const remainingDetails = [...groupedContent.examples, ...groupedContent.benefits, ...groupedContent.details];
  remainingDetails.slice(0, 5).forEach((detail) => {
    allSentences.push(detail.length > 150 ? detail.substring(0, 150) + "..." : detail);
  });

  // Combine into 2-3 simple paragraphs
  if (allSentences.length > 0) {
    const midPoint = Math.ceil(allSentences.length / 2);
    const firstHalf = allSentences.slice(0, midPoint);
    const secondHalf = allSentences.slice(midPoint);

    simplifiedNotes = firstHalf.join(" ") + "\n\n" + secondHalf.join(" ");
  }

  // Create key takeaways from actual sentences
  const allContent = [
    ...groupedContent.definitions.slice(0, 1),
    ...groupedContent.processes.slice(0, 2),
    ...groupedContent.examples.slice(0, 1),
    ...groupedContent.benefits.slice(0, 1),
    ...groupedContent.details.slice(0, 3)
  ].filter(Boolean);

  const keyTakeaways = allContent.slice(0, 6).map((content, i) => {
    const short = content.length > 80 ? content.substring(0, 80) + "..." : content;
    return short;
  });

  return {
    simplified_notes: simplifiedNotes.trim() || "Simplified notes based on your input. Please provide more content for better results.",
    key_takeaways: keyTakeaways.length > 0 ? keyTakeaways : ["Add your content to see key takeaways"],
    flashcards: buildFlashcardsFromText(sourceText),
  };
}

function normalizeTakeaways(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.replace(/^[-*\u2022\d.]+\s*/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeFlashcards(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((card) => ({
      question: String(card?.question ?? "").trim(),
      answer: String(card?.answer ?? "").trim(),
    }))
    .filter((card) => card.question && card.answer);
}

function normalizeStudyGuide(payload) {
  return {
    simplified_notes: String(payload?.simplified_notes ?? "").trim(),
    key_takeaways: normalizeTakeaways(payload?.key_takeaways).slice(0, 5),
    flashcards: normalizeFlashcards(payload?.flashcards),
  };
}

async function fetchRemoteGuide(trimmedText) {
  const prompt = buildPrompt(trimmedText);
  const request =
    IS_GEMINI_API
      ? {
          headers: {
            "Content-Type": "application/json",
            ...(AI_API_KEY ? { "x-goog-api-key": AI_API_KEY } : {}),
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  simplified_notes: {
                    type: "STRING",
                  },
                  key_takeaways: {
                    type: "ARRAY",
                    items: {
                      type: "STRING",
                    },
                  },
                  flashcards: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        question: {
                          type: "STRING",
                        },
                        answer: {
                          type: "STRING",
                        },
                      },
                      required: ["question", "answer"],
                    },
                  },
                },
                required: ["simplified_notes", "key_takeaways", "flashcards"],
              },
            },
          }),
        }
      : {
          headers: {
            "Content-Type": "application/json",
            ...(AI_API_KEY ? { Authorization: `Bearer ${AI_API_KEY}` } : {}),
          },
          body: JSON.stringify({
            prompt,
            input: trimmedText,
            system_prompt:
              "Analyze the provided study material and return only valid JSON with simplified notes, key takeaways, and flashcards.",
            response_format: "json",
          }),
        };

  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: request.headers,
    body: request.body,
  });

  const rawBody = await response.text();
  const parsedBody = tryParseJson(rawBody) ?? rawBody;

  if (!response.ok) {
    let message = "The AI service could not generate a study guide right now.";

    if (typeof parsedBody === "object" && parsedBody?.error) {
      // Handle nested error objects (e.g., { error: { message: "..." } })
      const errorObj = parsedBody.error;
      if (typeof errorObj === "string") {
        message = errorObj;
      } else if (errorObj?.message) {
        message = String(errorObj.message);
      } else {
        message = JSON.stringify(errorObj);
      }
    } else if (typeof parsedBody === "object" && parsedBody?.message) {
      message = String(parsedBody.message);
    } else if (typeof parsedBody === "string" && parsedBody) {
      message = parsedBody;
    }

    throw new Error(message);
  }

  const payload = findStudyGuidePayload(parsedBody);

  if (!payload) {
    throw new Error(
      "The AI response did not include valid study-guide JSON. Check your endpoint response format."
    );
  }

  return normalizeStudyGuide(payload);
}

export async function generateStudyGuide(sourceText) {
  const trimmedText = sourceText?.trim();

  if (!trimmedText) {
    throw new Error("Please paste your study material before generating.");
  }

  if (!AI_API_URL || !AI_API_KEY) {
    return buildLocalStudyGuide(trimmedText);
  }

  try {
    const normalized = await fetchRemoteGuide(trimmedText);

    if (
      !normalized.simplified_notes ||
      normalized.key_takeaways.length === 0 ||
      normalized.flashcards.length === 0
    ) {
      return buildLocalStudyGuide(trimmedText);
    }

    return normalized;
  } catch (error) {
    // API failed (e.g., rate limit), use local fallback
    console.log("API failed, using local fallback:", error.message);
    return buildLocalStudyGuide(trimmedText);
  }
}

export default generateStudyGuide;
