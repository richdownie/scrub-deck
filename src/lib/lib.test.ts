import { describe, expect, it } from "vitest";
import { buildQuiz } from "./quiz";
import { empty, liveStreak, recordStudy } from "./store";
import { decks } from "../data/decks";

const day = (d: number) => new Date(2026, 11, d, 9);

describe("streak", () => {
  it("starts at 1 and grows on consecutive days", () => {
    let s = recordStudy(empty, day(1));
    expect(s.streak).toBe(1);
    s = recordStudy(s, day(1));
    expect(s.streak).toBe(1);
    s = recordStudy(s, day(2));
    expect(s.streak).toBe(2);
  });
  it("restarts after a missed day", () => {
    const s = recordStudy(recordStudy(empty, day(1)), day(3));
    expect(s.streak).toBe(1);
  });
  it("crosses a month boundary", () => {
    const s = recordStudy(recordStudy(empty, new Date(2026, 10, 30)), new Date(2026, 11, 1));
    expect(s.streak).toBe(2);
  });
  it("shows 0 once a day has been missed", () => {
    const s = recordStudy(empty, day(1));
    expect(liveStreak(s, day(2))).toBe(1);
    expect(liveStreak(s, day(3))).toBe(0);
  });
});

describe("quiz", () => {
  it("gives four unique options including the right answer", () => {
    for (const deck of decks) {
      const quiz = buildQuiz(deck.cards);
      expect(quiz.length).toBeGreaterThan(0);
      for (const q of quiz) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options[q.answer]).toBe(q.card.back);
      }
    }
  });
  it("is empty when there are too few cards", () => {
    expect(buildQuiz(decks[0].cards.slice(0, 3))).toEqual([]);
  });
});

describe("content", () => {
  it("has unique card ids", () => {
    const ids = decks.flatMap((d) => d.cards.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
