import type { Card } from "../data/decks";

export type Question = { card: Card; options: string[]; answer: number };
export const MIN_QUIZ_CARDS = 4;
export const QUIZ_LENGTH = 10;

export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Multiple choice: each card's front, with its back hidden among three other backs from the deck. */
export function buildQuiz(cards: Card[], rand: () => number = Math.random): Question[] {
  const backs = [...new Set(cards.map((c) => c.back))];
  if (backs.length < MIN_QUIZ_CARDS) return [];
  return shuffle(cards, rand)
    .slice(0, QUIZ_LENGTH)
    .map((card) => {
      const wrong = shuffle(backs.filter((b) => b !== card.back), rand).slice(0, 3);
      const options = shuffle([card.back, ...wrong], rand);
      return { card, options, answer: options.indexOf(card.back) };
    });
}
