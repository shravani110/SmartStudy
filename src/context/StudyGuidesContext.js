import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  buildFlashcardsFromText,
  buildQuizFromText,
  generateStudyGuide,
  hasLegacyFlashcards,
} from "../api/aiService";
import { useAuth } from "./AuthContext";

const STORAGE_KEY_PREFIX = "@smart-study-quiz-generator/guides";
const StudyGuidesContext = createContext(null);
const isUsingRemoteAI =
  Boolean(process.env.EXPO_PUBLIC_AI_API_URL?.trim()) &&
  Boolean(process.env.EXPO_PUBLIC_AI_API_KEY?.trim());

function makeGuideTitle(sourceText) {
  // Get first substantial line
  const firstLine = sourceText
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 3);

  if (!firstLine) {
    return "Untitled Study Set";
  }

  // Clean the line but keep structure
  const cleanLine = firstLine.replace(/[^\w\s-&]/g, "").trim();

  // Find where definition/description starts and stop there
  const definitionPatterns = [
    /\bis\s+a\b/i, /\bis\s+an\b/i, /\bis\s+the\b/i,
    /\brefers\s+to\b/i, /\bmeans\b/i, /\bdefined\s+as\b/i,
    /\bis\s+one\s+of\b/i, /\bcan\s+be\s+defined\b/i,
    /\binvolves\b/i, /\bincludes\b/i, /\bconsists\s+of\b/i,
    /\ballows\b/i, /\bhelps\b/i, /\bprovides\b/i,
    /\bworks\s+by\b/i, /\bprocesses\b/i, /\bsteps?\b/i,
    /\btypes?\b/i, /\bexamples?\b/i, /\bsuch\s+as\b/i,
    /\bfor\s+example\b/i, /\blike\b/i,
    /\bbut\b/i, /\bhowever\b/i, /\balthough\b/i,
    /\bbecause\b/i, /\btherefore\b/i,
    /\bin\s+order\s+to\b/i,
  ];

  let titleWords = [];
  const allWords = cleanLine.split(/\s+/).filter(Boolean);

  for (const word of allWords) {
    const lowerWord = word.toLowerCase();
    // Check if this word starts a definition pattern
    const foundPattern = definitionPatterns.some((pattern) => {
      const match = cleanLine.toLowerCase().match(pattern);
      return match && cleanLine.toLowerCase().indexOf(match[0]) === cleanLine.toLowerCase().indexOf(lowerWord);
    });

    if (foundPattern) {
      break;
    }

    titleWords.push(word);

    // Limit to reasonable title length (4-6 words typically)
    if (titleWords.length >= 6) {
      break;
    }
  }

  // If we got too few words, try to get more content words
  if (titleWords.length < 2 && allWords.length > 2) {
    titleWords = allWords.slice(0, 4);
  }

  const title = titleWords.join(" ").trim();

  // Fallback if title is empty or too short
  if (!title || title.length < 3) {
    return "Study Guide";
  }

  return title;
}

function getStorageKey(userId) {
  if (!userId) {
    return null;
  }
  return `${STORAGE_KEY_PREFIX}/${userId}`;
}

function upgradeGuideIfNeeded(guide) {
  if (!guide || typeof guide !== "object") {
    return guide;
  }

  if (!guide.sourceText) {
    return guide;
  }

  // Upgrade if flashcards are legacy OR if quiz is missing
  const needsFlashcardUpgrade = hasLegacyFlashcards(guide.flashcards);
  const needsQuizUpgrade = !guide.quiz || guide.quiz.length === 0;
  
  if (!needsFlashcardUpgrade && !needsQuizUpgrade) {
    return guide;
  }

  const upgraded = { ...guide };
  
  if (needsFlashcardUpgrade) {
    upgraded.flashcards = buildFlashcardsFromText(guide.sourceText, 6);
  }
  
  // Add quiz if missing
  if (needsQuizUpgrade) {
    upgraded.quiz = buildQuizFromText(guide.sourceText, 10);
  }
  
  return upgraded;
}

export function StudyGuidesProvider({ children }) {
  const { user } = useAuth();
  const [guides, setGuides] = useState([]);
  const [selectedGuideId, setSelectedGuideId] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function loadGuides() {
      try {
        const storageKey = getStorageKey(user?.id || user?.email);
        if (!storageKey) {
          setGuides([]);
          setSelectedGuideId(null);
          setIsHydrated(true);
          return;
        }

        const raw = await AsyncStorage.getItem(storageKey);

        if (raw) {
          const parsed = JSON.parse(raw);

          if (Array.isArray(parsed) && parsed.length > 0) {
            const upgradedGuides = parsed.map(upgradeGuideIfNeeded);
            setGuides(upgradedGuides);
            setSelectedGuideId(upgradedGuides[0]?.id ?? null);
            setIsHydrated(true);
            return;
          }
        }

        setGuides([]);
        setSelectedGuideId(null);
      } catch (error) {
        console.warn("Failed to load study guides:", error);
        setGuides([]);
        setSelectedGuideId(null);
      } finally {
        setIsHydrated(true);
      }
    }

    loadGuides();
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const storageKey = getStorageKey(user?.id || user?.email);
    if (!storageKey) {
      return;
    }

    AsyncStorage.setItem(storageKey, JSON.stringify(guides)).catch((error) => {
      console.warn("Failed to save study guides:", error);
    });
  }, [guides, isHydrated, user?.id, user?.email]);

  useEffect(() => {
    if (guides.length === 0) {
      if (selectedGuideId !== null) {
        setSelectedGuideId(null);
      }

      return;
    }

    if (!selectedGuideId || !guides.some((guide) => guide.id === selectedGuideId)) {
      setSelectedGuideId(guides[0].id);
    }
  }, [guides, selectedGuideId]);

  const latestGuide = guides[0] ?? null;
  const activeGuide =
    guides.find((guide) => guide.id === selectedGuideId) || latestGuide || null;

  async function createGuideFromText(sourceText) {
    const studyGuide = await generateStudyGuide(sourceText);
    const now = new Date().toISOString();
    const guide = {
      id: `${Date.now()}`,
      title: makeGuideTitle(sourceText),
      createdAt: now,
      updatedAt: now,
      sourceText,
      ...studyGuide,
    };

    setGuides((current) => [guide, ...current]);
    setSelectedGuideId(guide.id);
    return guide;
  }

  function selectGuide(guideId) {
    setSelectedGuideId(guideId);
  }

  function getGuideById(guideId) {
    return guides.find((guide) => guide.id === guideId) || null;
  }

  async function removeGuide(guideId) {
    setGuides((current) => current.filter((guide) => guide.id !== guideId));
  }

  const value = useMemo(
    () => ({
      activeGuide,
      guides,
      isUsingRemoteAI,
      isHydrated,
      latestGuide,
      createGuideFromText,
      getGuideById,
      removeGuide,
      selectGuide,
      selectedGuideId,
    }),
    [activeGuide, guides, isHydrated, latestGuide, selectedGuideId]
  );

  return <StudyGuidesContext.Provider value={value}>{children}</StudyGuidesContext.Provider>;
}

export function useStudyGuides() {
  const context = useContext(StudyGuidesContext);

  if (!context) {
    throw new Error("useStudyGuides must be used inside StudyGuidesProvider");
  }

  return context;
}
