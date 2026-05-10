const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL?.trim();
const AI_API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY?.trim();
const REQUIRED_KEYS = ["simplified_notes", "key_takeaways", "flashcards"];
const IS_GEMINI_API = AI_API_URL?.includes("generativelanguage.googleapis.com");
const MIN_FLASHCARDS = 6;
const MAX_FLASHCARDS = 12;
const MIN_QUIZ_QUESTIONS = 10;
const MAX_QUIZ_QUESTIONS = 20;
const MAX_TAKEAWAYS = 10;

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
  const wordCount = userInput.split(/\s+/).length;
  const estimatedFlashcards = getTargetFlashcardCountFromWords(wordCount);
  const estimatedQuizQuestions = getTargetQuizCountFromWords(wordCount);
  const estimatedTakeaways = getTargetTakeawayCountFromWords(wordCount);
  
  return `Analyze the following text comprehensively. Return ONLY a valid JSON object with these keys:
- 'simplified_notes': A complete summary that covers the material from start to end. Do not skip sections.
- 'key_takeaways': An array of ${estimatedTakeaways} concise points that together cover the whole topic.
- 'flashcards': An array of ${estimatedFlashcards} flashcards (objects with 'question' and 'answer'). Questions must be based on the main topic and cover different parts of the material.
- 'quiz': An array of ${estimatedQuizQuestions} multiple choice questions (objects with 'question', 'options' array of 4 choices, 'correctAnswer' index 0-3, and 'explanation'). Questions must cover the full topic.

Content: ${userInput}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTargetTakeawayCountFromWords(wordCount) {
  return clamp(Math.ceil(wordCount / 100), 5, MAX_TAKEAWAYS);
}

function getTargetFlashcardCountFromWords(wordCount) {
  return clamp(Math.ceil(wordCount / 90), MIN_FLASHCARDS, MAX_FLASHCARDS);
}

function getTargetQuizCountFromWords(wordCount) {
  return clamp(Math.ceil(wordCount / 55), MIN_QUIZ_QUESTIONS, MAX_QUIZ_QUESTIONS);
}

function getTargetTakeawayCount(totalSentences) {
  return clamp(Math.ceil(totalSentences / 2), 5, MAX_TAKEAWAYS);
}

function getTargetFlashcardCount(totalSentences) {
  return clamp(Math.ceil(totalSentences / 2), MIN_FLASHCARDS, MAX_FLASHCARDS);
}

function getTargetQuizCount(totalSentences) {
  return clamp(Math.ceil(totalSentences * 0.75), MIN_QUIZ_QUESTIONS, MAX_QUIZ_QUESTIONS);
}

function hasStudyGuideShape(value) {
  return (
    value &&
    typeof value === "object" &&
    REQUIRED_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

// Build quiz questions from content with topic-wide coverage
function buildQuizFromGroupedContent(groupedContent, topicName, targetQuestions = MAX_QUIZ_QUESTIONS) {
  const quiz = [];
  const usedQuestions = new Set();
  const coverageItems = getCoverageItems(groupedContent);
  const desiredCount = clamp(targetQuestions, MIN_QUIZ_QUESTIONS, MAX_QUIZ_QUESTIONS);

  for (let i = 0; i < desiredCount && i < coverageItems.length; i += 1) {
    const currentItem = coverageItems[i];
    const question = dedupeQuestion(
      makeQuestionFromSentence(currentItem.sentence, topicName, currentItem.category, currentItem.index),
      topicName,
      usedQuestions
    );

    const correctAnswer = trimAnswer(currentItem.sentence);
    const distractors = coverageItems
      .filter((_, idx) => idx !== i)
      .map((item) => trimAnswer(item.sentence))
      .filter((answer) => answer && answer !== correctAnswer);
    const uniqueDistractors = Array.from(new Set(distractors)).slice(0, 3);

    while (uniqueDistractors.length < 3) {
      uniqueDistractors.push(`A different detail about ${topicName}.`);
    }

    const options = [correctAnswer, ...uniqueDistractors];
    const shuffledIndices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const shuffledOptions = shuffledIndices.map((idx) => options[idx]);
    const correctIndex = shuffledIndices.indexOf(0);

    quiz.push({
      question,
      options: shuffledOptions,
      correctAnswer: correctIndex,
      explanation: `This is supported by the study material: ${correctAnswer}`,
    });
  }

  while (quiz.length < desiredCount) {
    const genericQ = `Question ${quiz.length + 1}: What is an important idea about ${topicName}?`;
    quiz.push({
      question: genericQ,
      options: [
        "Its main definition",
        "How it works",
        "Its applications and key points",
        "All of the above",
      ],
      correctAnswer: 3,
      explanation: `The topic should be understood through definition, process, and application.`,
    });
  }

  return quiz;
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

function buildGroupedContent(sourceText) {
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

  return {
    groupedContent,
    fallbackSentences,
  };
}

function collectAllContent(groupedContent) {
  return [
    ...groupedContent.definitions,
    ...groupedContent.processes,
    ...groupedContent.examples,
    ...groupedContent.benefits,
    ...groupedContent.details,
  ].filter(Boolean);
}

function getCoverageItems(groupedContent) {
  const groups = [
    ["definitions", groupedContent.definitions],
    ["processes", groupedContent.processes],
    ["examples", groupedContent.examples],
    ["benefits", groupedContent.benefits],
    ["details", groupedContent.details],
  ];
  const maxLength = Math.max(0, ...groups.map(([, sentences]) => sentences.length));
  const items = [];

  for (let index = 0; index < maxLength; index += 1) {
    groups.forEach(([category, sentences]) => {
      if (sentences[index]) {
        items.push({
          category,
          sentence: sentences[index],
          index,
        });
      }
    });
  }

  return items;
}

function pickDistributedItems(items, count) {
  if (items.length <= count) {
    return items;
  }

  const picked = [];
  const step = (items.length - 1) / Math.max(1, count - 1);

  for (let index = 0; index < count; index += 1) {
    picked.push(items[Math.round(index * step)]);
  }

  return Array.from(new Set(picked));
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

function buildFlashcardsFromGroupedContent(groupedContent, topicName, targetFlashcards = MAX_FLASHCARDS) {
  const flashcards = [];
  const usedQuestions = new Set();
  const coverageItems = getCoverageItems(groupedContent);
  const desiredCount = clamp(targetFlashcards, MIN_FLASHCARDS, MAX_FLASHCARDS);

  coverageItems.forEach((item) => {
    if (flashcards.length >= desiredCount) {
      return;
    }

    const question = dedupeQuestion(
      makeQuestionFromSentence(item.sentence, topicName, item.category, item.index),
      topicName,
      usedQuestions
    );

    flashcards.push({
      question,
      answer: trimAnswer(item.sentence),
    });
  });

  while (flashcards.length < desiredCount) {
    const genericQuestions = [
      `What is the main definition of ${topicName}?`,
      `How does ${topicName} work?`,
      `What are the key benefits of ${topicName}?`,
      `What is an example of ${topicName} in practice?`,
      `Why is ${topicName} important to understand?`,
      `What are the main components of ${topicName}?`,
    ];
    
    const genericQ = genericQuestions[flashcards.length % genericQuestions.length];
    if (!usedQuestions.has(genericQ)) {
      usedQuestions.add(genericQ);
      flashcards.push({
        question: genericQ,
        answer: `Review the study material for the main point about ${topicName}.`,
      });
    }
  }

  return flashcards;
}

// Public export for building quiz from text
export function buildQuizFromText(sourceText, targetQuestions = null) {
  const { groupedContent, fallbackSentences } = buildGroupedContent(sourceText);
  const topicName = makeTopicName(sourceText);
  const desiredCount = targetQuestions ?? getTargetQuizCount(fallbackSentences.length);
  return buildQuizFromGroupedContent(groupedContent, topicName, desiredCount);
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

export function buildFlashcardsFromText(sourceText, targetFlashcards = null) {
  const { groupedContent, fallbackSentences } = buildGroupedContent(sourceText);
  const topicName = makeTopicName(sourceText);
  const desiredCount = targetFlashcards ?? getTargetFlashcardCount(fallbackSentences.length);
  const flashcards = buildFlashcardsFromGroupedContent(groupedContent, topicName, desiredCount);

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
  const { groupedContent, fallbackSentences } = buildGroupedContent(sourceText);
  const topicName = makeTopicName(sourceText);
  const allContent = collectAllContent(groupedContent);
  const targetTakeaways = getTargetTakeawayCount(fallbackSentences.length);
  const targetFlashcards = getTargetFlashcardCount(fallbackSentences.length);
  const targetQuizQuestions = getTargetQuizCount(fallbackSentences.length);

  // Build comprehensive simplified notes - include ALL content without truncation
  let simplifiedNotes = "";

  // Create comprehensive summary organized by topic flow
  if (allContent.length > 0) {
    // Organize into logical paragraphs based on content length
    const sentencesPerParagraph = Math.max(3, Math.ceil(allContent.length / 4));
    const paragraphs = [];
    
    for (let i = 0; i < allContent.length; i += sentencesPerParagraph) {
      const paragraphSentences = allContent.slice(i, i + sentencesPerParagraph);
      paragraphs.push(paragraphSentences.join(" "));
    }
    
    simplifiedNotes = paragraphs.join("\n\n");
  }

  const keyTakeaways = pickDistributedItems(allContent, targetTakeaways).map((content) => {
    // Don't truncate - use full content if reasonable, or keep substantial portion
    return content.length > 200 ? content.substring(0, 200).trim() + "..." : content;
  });

  const flashcards = buildFlashcardsFromGroupedContent(groupedContent, topicName, targetFlashcards);
  const quiz = buildQuizFromGroupedContent(groupedContent, topicName, targetQuizQuestions);

  return {
    simplified_notes: simplifiedNotes.trim() || "Simplified notes based on your input. Please provide more content for better results.",
    key_takeaways: keyTakeaways.length > 0 ? keyTakeaways : ["Add your content to see key takeaways"],
    flashcards,
    quiz,
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
    .filter((card) => card.question && card.answer)
    .slice(0, MAX_FLASHCARDS);
}

function normalizeQuiz(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((q) => ({
      question: String(q?.question ?? "").trim(),
      options: Array.isArray(q?.options) ? q.options.map(String).filter(Boolean).slice(0, 4) : [],
      correctAnswer: typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: String(q?.explanation ?? "").trim() || "No explanation provided.",
    }))
    .filter((q) => q.question && q.options.length >= 2)
    .slice(0, MAX_QUIZ_QUESTIONS);
}

function normalizeStudyGuide(payload, sourceText = "") {
  const flashcards = normalizeFlashcards(payload?.flashcards);
  const quiz = normalizeQuiz(payload?.quiz);
  const fallbackSource = sourceText || payload?.simplified_notes || "";
  
  return {
    simplified_notes: String(payload?.simplified_notes ?? "").trim(),
    key_takeaways: normalizeTakeaways(payload?.key_takeaways).slice(0, MAX_TAKEAWAYS),
    flashcards:
      flashcards.length >= MIN_FLASHCARDS ? flashcards : buildFlashcardsFromText(fallbackSource),
    quiz:
      quiz.length >= MIN_QUIZ_QUESTIONS ? quiz : buildQuizFromText(fallbackSource),
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
                  quiz: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        question: {
                          type: "STRING",
                        },
                        options: {
                          type: "ARRAY",
                          items: {
                            type: "STRING",
                          },
                        },
                        correctAnswer: {
                          type: "NUMBER",
                        },
                        explanation: {
                          type: "STRING",
                        },
                      },
                      required: ["question", "options", "correctAnswer", "explanation"],
                    },
                  },
                },
                required: ["simplified_notes", "key_takeaways", "flashcards", "quiz"],
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
              "Analyze the provided study material and return only valid JSON with simplified notes, key takeaways, flashcards, and quiz questions that cover the full topic.",
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

  return normalizeStudyGuide(payload, trimmedText);
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
      normalized.flashcards.length < MIN_FLASHCARDS ||
      normalized.quiz.length < MIN_QUIZ_QUESTIONS
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
