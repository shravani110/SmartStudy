# SmartStudy

SmartStudy is a React Native + Expo study assistant app that turns pasted study material into simplified notes, key takeaways, flashcards, and quizzes.

## Features

- Phone number + OTP-style local login flow
- Paste study material and generate a study set
- Simplified notes in easy language
- Key takeaway summaries
- Flashcards with tap-to-reveal answers
- Topic-based quizzes generated from each study set
- Library screen for saved study guides
- Local persistence with AsyncStorage
- Light and dark theme support
- Optional AI endpoint support through Expo public environment variables
- Local fallback generation when the AI API is unavailable

## Tech Stack

- Expo
- React Native
- React Navigation
- AsyncStorage
- React Native Reanimated

## Project Structure

- `App.js` app entry and navigation setup
- `src/screens/` app screens
- `src/components/` reusable UI components
- `src/context/` auth, theme, and study guide state
- `src/api/aiService.js` study guide and flashcard generation logic
- `src/utils/quiz.js` quiz question generation

## Setup

```bash
npm install
npm start
```

To run on Android:

```bash
npm run android
```

## Environment Variables

Create a `.env` file if you want to connect a remote AI API:

```env
EXPO_PUBLIC_AI_API_URL=your_api_url
EXPO_PUBLIC_AI_API_KEY=your_api_key
```

If these are not provided, the app still works using local fallback generation.

## Current App Flow

1. Log in with name and phone number.
2. Paste study content on the Home screen.
3. Generate a study set.
4. Review simplified notes and key takeaways.
5. Practice using flashcards and quizzes.
6. Reopen saved study sets from the Library.
