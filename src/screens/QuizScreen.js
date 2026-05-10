import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInUp } from "react-native-reanimated";

import EmptyState from "../components/EmptyState";
import { shadows } from "../constants/theme";
import { getColors } from "../constants/theme";
import { useStudyGuides } from "../context/StudyGuidesContext";
import { useTheme } from "../context/ThemeContext";
import { buildQuizQuestions } from "../utils/quiz";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";

function normalizeQuizQuestion(question, index) {
  const options = Array.isArray(question?.options) ? question.options.map(String).filter(Boolean) : [];
  const fallbackCorrectIndex =
    typeof question?.correctAnswer === "string"
      ? options.findIndex((option) => option === question.correctAnswer)
      : -1;
  const correctAnswerIndex =
    typeof question?.correctAnswer === "number"
      ? question.correctAnswer
      : fallbackCorrectIndex;

  return {
    id: String(question?.id ?? `${question?.question ?? "question"}-${index}`),
    question: String(question?.question ?? "").trim(),
    options,
    correctAnswerIndex:
      correctAnswerIndex >= 0 && correctAnswerIndex < options.length ? correctAnswerIndex : 0,
    explanation: String(question?.explanation ?? "").trim(),
  };
}

export default function QuizScreen() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { guides } = useStudyGuides();
  const navigation = useNavigation();
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const selectedTopic = guides.find((g) => g.id === selectedTopicId);
  const questions = useMemo(() => {
    if (!selectedTopic) {
      return [];
    }

    const rawQuestions =
      Array.isArray(selectedTopic.quiz) && selectedTopic.quiz.length > 0
        ? selectedTopic.quiz
        : buildQuizQuestions(selectedTopic.flashcards);

    return rawQuestions
      .map((question, index) => normalizeQuizQuestion(question, index))
      .filter((question) => question.question && question.options.length >= 2);
  }, [selectedTopic]);
  const currentQuestion = questions[questionIndex];
  const totalTime = questions.length * 30;
  const insets = useSafeAreaInsets();

  // Manage tab bar visibility with proper safe area
  useLayoutEffect(() => {
    if (isQuizStarted || selectedTopic) {
      navigation.setOptions({
        tabBarStyle: { display: "none" },
      });
    } else {
      // Explicitly set tabBarStyle with safe area insets
      navigation.setOptions({
        tabBarStyle: {
          display: "flex",
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 5,
        },
      });
    }
  }, [isQuizStarted, selectedTopic, navigation, insets.bottom]);

  // Handle hardware back button to return to quiz main section
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selectedTopic) {
        setSelectedTopicId(null); // Go back to quiz main list
        setIsQuizStarted(false);
        return true; // Prevent default navigation
      }
      return false; // Let default behavior happen on main list
    });

    return () => backHandler.remove();
  }, [selectedTopic]);

  // Timer effect: starts only when isQuizStarted is true
  useEffect(() => {
    if (isQuizStarted && selectedTopic && !isComplete) {
      setTimeLeft(totalTime);
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [isQuizStarted, selectedTopic, isComplete, totalTime]);

  // Hide Android system navigation bar and disable back button during quiz
  useEffect(() => {
    const manageNavigationBar = async () => {
      try {
        if (isQuizStarted) {
          await NavigationBar.setVisibilityAsync("hidden");
        } else {
          await NavigationBar.setVisibilityAsync("visible");
        }
      } catch (error) {
        // NavigationBar native module not available, skip
      }
    };
    manageNavigationBar();

    // Disable hardware back button during active quiz
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isQuizStarted) {
        return true; // Prevent default behavior
      }
      return false;
    });

    return () => {
      try {
        NavigationBar.setVisibilityAsync("visible");
      } catch (error) {
        // Ignore cleanup errors
      }
      backHandler.remove();
    };
  }, [isQuizStarted]);

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          handleQuizSubmit();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive]);

  function handleTopicSelect(topicId) {
    setSelectedTopicId(topicId);
    setQuestionIndex(0);
    setSelectedOption(null);
    setUserAnswers([]);
    setIsComplete(false);
    setIsQuizStarted(false);
  }

  function handleStartQuiz() {
    setIsQuizStarted(true);
  }

  function handleOptionPress(option) {
    // Only set selected state - no evaluation yet
    setSelectedOption(option);
  }

  function handleNext() {
    if (!selectedOption) return;

    // Save the user's answer
    const newAnswers = [...userAnswers, selectedOption];
    setUserAnswers(newAnswers);

    if (questionIndex === questions.length - 1) {
      handleQuizSubmit();
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedOption(null);
  }

  function handleQuizSubmit() {
    setIsComplete(true);
    setTimerActive(false);
  }

  function handleRetakeQuiz() {
    setQuestionIndex(0);
    setSelectedOption(null);
    setUserAnswers([]);
    setIsComplete(false);
    setIsQuizStarted(true);
  }

  function handleBackToTopics() {
    setSelectedTopicId(null);
    setIsQuizStarted(false);
    setQuestionIndex(0);
    setSelectedOption(null);
    setUserAnswers([]);
    setIsComplete(false);
    setTimeLeft(0);
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // STEP 1: Default View - Show topic list
  if (!selectedTopic) {
    if (guides.length === 0) {
      return (
        <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <EmptyState
              icon="help-circle-outline"
              title="No quiz available yet"
              description="Generate a study set first, then come back here for multiple-choice review."
            />
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <FlatList
            scrollEnabled={false}
            data={guides}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.delay(index * 100).duration(300)}>
                <Pressable
                  onPress={() => handleTopicSelect(item.id)}
                  style={({ pressed }) => [
                    styles.topicCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    pressed && styles.topicCardPressed,
                  ]}
                >
                  <View style={styles.topicCardTextContainer}>
                    <Text style={[styles.topicCardTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.topicCardMeta, { color: colors.textSoft }]}>
                      {(Array.isArray(item.quiz) && item.quiz.length > 0 ? item.quiz.length : buildQuizQuestions(item.flashcards).length)} questions • Tap to start quiz
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </Pressable>
              </Animated.View>
            )}
          />
        </ScrollView>
      </View>
    );
  }

  // STEP 2: Pre-Quiz Screen - Show topic info and "Start Quiz" button
  if (!isQuizStarted) {
    if (questions.length === 0) {
      return (
        <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <EmptyState
              icon="help-circle-outline"
              title="Quiz not ready yet"
              description="This study set needs a few flashcards before a quiz can be created."
            />
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <View style={[styles.preQuizContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.preQuizLabel, { color: colors.primary }]}>Ready for Quiz?</Text>
              <Text style={[styles.preQuizTitle, { color: colors.text }]}>{selectedTopic.title}</Text>

              <View style={styles.infoGrid}>
                <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>{questions.length}</Text>
                  <Text style={[styles.infoLabel, { color: colors.textSoft }]}>Questions</Text>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>
                    {formatTime(totalTime)}
                  </Text>
                  <Text style={[styles.infoLabel, { color: colors.textSoft }]}>Time Limit</Text>
                </View>
              </View>

              <Text style={[styles.preQuizDescription, { color: colors.textSoft }]}>
                Once you start, you'll be in focused exam mode. You cannot exit or pause the quiz.
              </Text>

              <Pressable
                onPress={handleStartQuiz}
                style={({ pressed }) => [
                  styles.startButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.startButtonPressed,
                ]}
              >
                <Text style={styles.startButtonText}>Start Quiz</Text>
              </Pressable>

              <Pressable
                onPress={() => handleBackToTopics()}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // STEP 3: Active Quiz - Focused examination mode
  if (isQuizStarted && !isComplete && currentQuestion) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* Timer at top - always visible */}
        <View style={[styles.timerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.timerContent}>
            <Text style={[styles.timerLabel, { color: colors.textSoft }]}>Time Left</Text>
            <Text
              style={[
                styles.timerDisplay,
                {
                  color: timeLeft <= 60 ? colors.danger : colors.primary,
                },
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
          </View>
        </View>

        {/* Quiz content */}
        <ScrollView
          contentContainerStyle={[
            styles.quizScrollContent,
            { paddingBottom: 40 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled
        >
          <View style={styles.quizContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${((questionIndex + 1) / questions.length) * 100}%`,
                  },
                ]}
              />
            </View>

            <Text style={[styles.progressText, { color: colors.primary }]}>
              Question {questionIndex + 1} of {questions.length}
            </Text>

            <Text style={[styles.questionText, { color: colors.text }]}>{currentQuestion.question}</Text>

            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => handleOptionPress(option)}
                    disabled={selectedOption !== null}
                    style={({ pressed }) => [
                      styles.optionButton,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isSelected
                        ? {
                            backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.08)",
                            borderColor: colors.primary,
                            borderWidth: 2,
                          }
                        : null,
                      pressed && !selectedOption ? styles.optionPressed : null,
                    ]}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleNext}
              disabled={!selectedOption}
              style={[
                styles.nextButton,
                { backgroundColor: colors.primary },
                !selectedOption ? styles.nextButtonDisabled : null,
              ]}
            >
              <Text style={styles.nextButtonText}>
                {questionIndex === questions.length - 1 ? "Submit Quiz" : "Next Question"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // STEP 4: Results View
  if (isComplete) {
    // Calculate score based on userAnswers
    const score = userAnswers.filter(
      (answer, index) => answer === questions[index].options[questions[index].correctAnswerIndex]
    ).length;

    const percentage = Math.round((score / questions.length) * 100);
    let resultMessage = "";
    let resultColor = colors.primary;

    if (percentage === 100) {
      resultMessage = "Perfect Score! Outstanding!";
      resultColor = colors.success;
    } else if (percentage >= 80) {
      resultMessage = "Excellent! Great job!";
      resultColor = colors.success;
    } else if (percentage >= 60) {
      resultMessage = "Good effort! Keep practicing.";
      resultColor = colors.primary;
    } else {
      resultMessage = "Review the material and try again.";
      resultColor = colors.danger;
    }

    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.resultsScrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Score Section */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.heroScoreSection}>
            <Text style={[styles.resultLabel, { color: colors.primary }]}>Quiz Completed</Text>

            <Text style={[styles.heroScore, { color: resultColor }]}>{score}</Text>
            <Text style={[styles.heroScoreSubtitle, { color: colors.textSoft }]}>
              out of {questions.length}
            </Text>

            <Text style={[styles.heroPercentage, { color: resultColor }]}>{percentage}%</Text>

            <Text style={[styles.heroMessage, { color: colors.text }]}>{resultMessage}</Text>
          </Animated.View>

          {/* Review List Section */}
          <Text style={[styles.reviewTitle, { color: colors.text }]}>Review Your Answers</Text>

          {questions.map((question, index) => {
            const userAnswer = userAnswers[index];
            const correctAnswer = question.options[question.correctAnswerIndex];
            const isCorrect = userAnswer === correctAnswer;

            return (
              <Animated.View
                key={`review-${index}`}
                entering={FadeInUp.delay((index + 1) * 50).duration(300)}
                style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.reviewQuestionHeader}>
                  <Text style={[styles.reviewQuestionNumber, { color: colors.primary }]}>
                    Question {index + 1}
                  </Text>
                  {isCorrect ? (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  ) : (
                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                  )}
                </View>

                <Text style={[styles.reviewQuestion, { color: colors.text }]}>{question.question}</Text>

                {/* User's Answer */}
                <View
                  style={[
                    styles.answerBox,
                    {
                      backgroundColor: isCorrect
                        ? isDarkMode
                          ? "rgba(34, 197, 94, 0.1)"
                          : "rgba(34, 197, 94, 0.08)"
                        : isDarkMode
                        ? "rgba(239, 68, 68, 0.1)"
                        : "rgba(239, 68, 68, 0.08)",
                      borderColor: isCorrect ? colors.success : colors.danger,
                    },
                  ]}
                >
                  <View style={styles.answerLabelRow}>
                    <Text style={[styles.answerLabel, { color: isCorrect ? colors.success : colors.danger }]}>
                      Your Answer
                    </Text>
                    {isCorrect && <Ionicons name="checkmark" size={16} color={colors.success} />}
                  </View>
                  <Text style={[styles.answerText, { color: colors.text }]}>{userAnswer || "Not answered"}</Text>
                </View>

                {/* Correct Answer (if incorrect) */}
                {!isCorrect && (
                  <View
                    style={[
                      styles.answerBox,
                      {
                        backgroundColor: isDarkMode ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.08)",
                        borderColor: colors.success,
                        marginTop: 12,
                      },
                    ]}
                  >
                    <View style={styles.answerLabelRow}>
                      <Text style={[styles.answerLabel, { color: colors.success }]}>Correct Answer</Text>
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                    </View>
                    <Text style={[styles.answerText, { color: colors.text }]}>{correctAnswer}</Text>
                  </View>
                )}
              </Animated.View>
            );
          })}

          {/* Spacer for sticky buttons */}
          <View style={styles.buttonSpacer} />
        </ScrollView>

        {/* Sticky Action Buttons */}
        <View style={[styles.stickyButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: 16 + insets.bottom }]}>
          <Pressable
            onPress={handleRetakeQuiz}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.primary },
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Retake Quiz</Text>
          </Pressable>

          <Pressable
            onPress={handleBackToTopics}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to Topics</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  resultsScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 160,
  },
  quizScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  // STEP 1: Topic cards
  topicCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...shadows.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topicCardPressed: {
    opacity: 0.9,
  },
  topicCardTextContainer: {
    flex: 1,
  },
  topicCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  topicCardMeta: {
    fontSize: 12,
  },
  // STEP 2: Pre-Quiz Screen
  preQuizContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    marginTop: 40,
    ...shadows.card,
  },
  preQuizLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  preQuizTitle: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 32,
    textAlign: "center",
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 32,
    gap: 16,
  },
  infoCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  infoValue: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  preQuizDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
  },
  startButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  startButtonPressed: {
    opacity: 0.9,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  cancelButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  // STEP 3: Active Quiz
  timerBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  timerContent: {
    alignItems: "center",
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  timerDisplay: {
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  quizContainer: {
    paddingVertical: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 20,
  },
  questionText: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 34,
    marginBottom: 32,
  },
  optionsContainer: {
    marginBottom: 28,
  },
  optionButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 12,
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },
  nextButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  // STEP 4: Results
  heroScoreSection: {
    alignItems: "center",
    marginBottom: 40,
    paddingVertical: 20,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 24,
  },
  heroScore: {
    fontSize: 72,
    fontWeight: "900",
    marginBottom: 0,
  },
  heroScoreSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  heroPercentage: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 20,
  },
  heroMessage: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
  reviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  reviewQuestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reviewQuestionNumber: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  reviewQuestion: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 16,
  },
  answerBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  answerLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  buttonSpacer: {
    height: 20,
  },
  stickyButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonPressed: {
    opacity: 0.8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
