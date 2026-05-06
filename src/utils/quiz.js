function shuffle(list) {
  const clone = [...list];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

function makeFallbackOption(answer, fallbackIndex) {
  const genericOptions = [
    "A broader overview of the topic",
    "A less accurate explanation",
    "A related but different concept",
    "An incomplete definition",
  ];

  const genericOption = genericOptions[fallbackIndex % genericOptions.length];
  return answer === genericOption ? `Alternative explanation ${fallbackIndex + 1}` : genericOption;
}

export function buildQuizQuestions(flashcards = []) {
  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    return [];
  }

  const usableCards = flashcards
    .filter((card) => card?.question && card?.answer)
    .slice(0, 10);

  return usableCards.map((card, index) => {
    const distractors = flashcards
      .filter((_, itemIndex) => itemIndex !== index)
      .map((item) => item.answer)
      .filter(Boolean)
      .filter((answer) => answer !== card.answer);

    const optionPool = shuffle(distractors).slice(0, 3);
    optionPool.push(card.answer);

    while (optionPool.length < 4) {
      optionPool.push(makeFallbackOption(card.answer, optionPool.length));
    }

    const uniqueOptions = Array.from(new Set(optionPool));

    while (uniqueOptions.length < 4) {
      uniqueOptions.push(makeFallbackOption(card.answer, uniqueOptions.length + index));
    }

    return {
      id: `${card.question}-${index}`,
      question: card.question,
      correctAnswer: card.answer,
      options: shuffle(uniqueOptions).slice(0, 4),
    };
  });
}
