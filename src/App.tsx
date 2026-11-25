import { useEffect, useMemo, useState } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { decks, MY_DECK_ID, type Card, type Deck } from "./data/decks";
import { buildQuiz, MIN_QUIZ_CARDS, shuffle, type Question } from "./lib/quiz";
import { liveStreak, load, recordStudy, save, type Mark, type State } from "./lib/store";

type Screen =
  | { name: "home" }
  | { name: "deck"; deckId: string }
  | { name: "study"; deckId: string; cards: Card[] }
  | { name: "quiz"; deckId: string; questions: Question[] }
  | { name: "about" };

const tap = () => void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

export default function App() {
  const [state, setState] = useState<State>(load);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  useEffect(() => {
    save(state);
  }, [state]);
  useEffect(() => {
    window.scrollTo(0, 0); // newer browsers return a promise here, so do not return it
  }, [screen]);

  const allDecks: Deck[] = useMemo(
    () => [
      ...decks,
      { id: MY_DECK_ID, name: "My Cards", emoji: "✏️", blurb: "Cards you write yourself", cards: state.mine },
    ],
    [state.mine],
  );
  const deckOf = (id: string) => allDecks.find((d) => d.id === id) ?? allDecks[0];
  const studied = () => setState((s) => recordStudy(s, new Date()));

  switch (screen.name) {
    case "home":
      return <Home state={state} decks={allDecks} go={setScreen} />;
    case "about":
      return <About back={() => setScreen({ name: "home" })} />;
    case "deck": {
      const deck = deckOf(screen.deckId);
      return (
        <DeckView
          deck={deck}
          state={state}
          back={() => setScreen({ name: "home" })}
          study={(cards) => setScreen({ name: "study", deckId: deck.id, cards })}
          quiz={() => setScreen({ name: "quiz", deckId: deck.id, questions: buildQuiz(deck.cards) })}
          addCard={(front, back) =>
            setState((s) => ({ ...s, mine: [...s.mine, { id: `${MY_DECK_ID}:${Date.now()}`, front, back }] }))
          }
          removeCard={(id) => setState((s) => ({ ...s, mine: s.mine.filter((c) => c.id !== id) }))}
        />
      );
    }
    case "study":
      return (
        <Study
          deck={deckOf(screen.deckId)}
          cards={screen.cards}
          mark={(id, m) => {
            setState((s) => ({ ...s, marks: { ...s.marks, [id]: m } }));
            studied();
          }}
          done={() => setScreen({ name: "deck", deckId: screen.deckId })}
        />
      );
    case "quiz":
      return (
        <Quiz
          deck={deckOf(screen.deckId)}
          questions={screen.questions}
          finish={(pct) => {
            setState((s) => ({ ...s, best: { ...s.best, [screen.deckId]: Math.max(pct, s.best[screen.deckId] ?? 0) } }));
            studied();
          }}
          again={() => setScreen({ name: "quiz", deckId: screen.deckId, questions: buildQuiz(deckOf(screen.deckId).cards) })}
          done={() => setScreen({ name: "deck", deckId: screen.deckId })}
        />
      );
  }
}

function knownCount(deck: Deck, state: State) {
  return deck.cards.filter((c) => state.marks[c.id] === "known").length;
}

function Home({ state, decks, go }: { state: State; decks: Deck[]; go: (s: Screen) => void }) {
  const streak = liveStreak(state, new Date());
  const total = decks.reduce((n, d) => n + d.cards.length, 0);
  const known = decks.reduce((n, d) => n + knownCount(d, state), 0);
  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Scrub Deck</p>
          <h1>{streak > 0 ? "Keep it going." : "Ready to study?"}</h1>
        </div>
        <button className="ghost" onClick={() => go({ name: "about" })} aria-label="About">
          About
        </button>
      </header>

      <section className="stats">
        <div className="stat">
          <span className="stat-num">{streak}</span>
          <span className="stat-label">day streak</span>
        </div>
        <div className="stat">
          <span className="stat-num">{known}</span>
          <span className="stat-label">of {total} cards known</span>
        </div>
      </section>

      <h2 className="section">Decks</h2>
      <ul className="decks">
        {decks.map((d) => {
          const k = knownCount(d, state);
          const pct = d.cards.length ? Math.round((k / d.cards.length) * 100) : 0;
          return (
            <li key={d.id}>
              <button className="deck" onClick={() => (tap(), go({ name: "deck", deckId: d.id }))}>
                <span className="deck-emoji" aria-hidden="true">
                  {d.emoji}
                </span>
                <span className="deck-body">
                  <span className="deck-name">{d.name}</span>
                  <span className="deck-blurb">
                    {d.cards.length ? `${d.cards.length} cards · ${d.blurb}` : d.blurb}
                  </span>
                  <span className="bar" role="img" aria-label={`${pct}% known`}>
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="fine">Study aid only. Always follow your textbook, instructor, and facility policy.</p>
    </main>
  );
}

function TopBar({ title, back, right }: { title: string; back: () => void; right?: string }) {
  return (
    <nav className="top">
      <button className="ghost" onClick={back}>
        ‹ Back
      </button>
      <span className="top-title">{title}</span>
      <span className="top-right">{right}</span>
    </nav>
  );
}

function DeckView(p: {
  deck: Deck;
  state: State;
  back: () => void;
  study: (cards: Card[]) => void;
  quiz: () => void;
  addCard: (front: string, back: string) => void;
  removeCard: (id: string) => void;
}) {
  const { deck, state } = p;
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const mine = deck.id === MY_DECK_ID;
  const learning = deck.cards.filter((c) => state.marks[c.id] !== "known");
  const canQuiz = new Set(deck.cards.map((c) => c.back)).size >= MIN_QUIZ_CARDS;
  const best = state.best[deck.id];

  return (
    <main className="page">
      <TopBar title="" back={p.back} />
      <header className="deck-head">
        <span className="big-emoji" aria-hidden="true">
          {deck.emoji}
        </span>
        <h1>{deck.name}</h1>
        <p className="muted">
          {knownCount(deck, state)} of {deck.cards.length} known
          {best !== undefined ? ` · best quiz ${best}%` : ""}
        </p>
      </header>

      <div className="actions">
        <button className="primary" disabled={!deck.cards.length} onClick={() => (tap(), p.study(shuffle(deck.cards)))}>
          Study all
        </button>
        {learning.length > 0 && learning.length < deck.cards.length && (
          <button className="secondary" onClick={() => (tap(), p.study(shuffle(learning)))}>
            Study the {learning.length} I am still learning
          </button>
        )}
        <button className="secondary" disabled={!canQuiz} onClick={() => (tap(), p.quiz())}>
          {canQuiz ? "Quiz me" : `Quiz me (needs ${MIN_QUIZ_CARDS} cards)`}
        </button>
      </div>

      {mine && (
        <form
          className="add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!front.trim() || !back.trim()) return;
            p.addCard(front.trim(), back.trim());
            setFront("");
            setBack("");
          }}
        >
          <h2 className="section">Add a card</h2>
          <input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front (the question)" maxLength={120} />
          <input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back (the answer)" maxLength={200} />
          <button className="primary" disabled={!front.trim() || !back.trim()}>
            Add card
          </button>
        </form>
      )}

      <h2 className="section">Cards</h2>
      {deck.cards.length === 0 && <p className="muted">No cards yet. Add your first one above.</p>}
      <ul className="rows">
        {deck.cards.map((c) => (
          <li key={c.id} className="row">
            <span className={`dot ${state.marks[c.id] ?? ""}`} aria-hidden="true" />
            <span className="row-text">
              <strong>{c.front}</strong>
              <span>{c.back}</span>
            </span>
            {mine && (
              <button className="ghost danger" onClick={() => p.removeCard(c.id)} aria-label={`Delete ${c.front}`}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

function Study(p: { deck: Deck; cards: Card[]; mark: (id: string, m: Mark) => void; done: () => void }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [got, setGot] = useState(0);
  const card = p.cards[i];

  if (!card) {
    return (
      <main className="page center">
        <span className="big-emoji" aria-hidden="true">
          🎉
        </span>
        <h1>Deck done</h1>
        <p className="muted">
          You knew {got} of {p.cards.length}.
        </p>
        <button className="primary" onClick={p.done}>
          Back to deck
        </button>
      </main>
    );
  }

  const answer = (m: Mark) => {
    tap();
    p.mark(card.id, m);
    if (m === "known") setGot((g) => g + 1);
    setFlipped(false);
    setI((n) => n + 1);
  };

  return (
    <main className="page study">
      <TopBar title={p.deck.name} back={p.done} right={`${i + 1} / ${p.cards.length}`} />
      <button
        key={card.id}
        className={`card ${flipped ? "flipped" : ""}`}
        onClick={() => (tap(), setFlipped((f) => !f))}
        aria-label={flipped ? `Answer: ${card.back}. Tap to see the question.` : `${card.front}. Tap to see the answer.`}
      >
        <span className="face front">
          <span className="card-text">{card.front}</span>
          <span className="hint">Tap to flip</span>
        </span>
        <span className="face back">
          <span className="card-label">{card.front}</span>
          <span className="card-text">{card.back}</span>
        </span>
      </button>
      <div className={`answer ${flipped ? "" : "hidden"}`}>
        <button className="secondary" disabled={!flipped} onClick={() => answer("learning")}>
          Still learning
        </button>
        <button className="primary" disabled={!flipped} onClick={() => answer("known")}>
          Got it
        </button>
      </div>
    </main>
  );
}

function Quiz(p: { deck: Deck; questions: Question[]; finish: (pct: number) => void; again: () => void; done: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const q = p.questions[i];
  const total = p.questions.length;

  if (!q) {
    const pct = total ? Math.round((right / total) * 100) : 0;
    return (
      <main className="page center">
        <span className="big-emoji" aria-hidden="true">
          {pct >= 80 ? "🏆" : "💪"}
        </span>
        <h1>{pct}%</h1>
        <p className="muted">
          {right} of {total} right in {p.deck.name}.
        </p>
        <button className="primary" onClick={p.again}>
          Try again
        </button>
        <button className="secondary" onClick={p.done}>
          Back to deck
        </button>
      </main>
    );
  }

  const pick = (n: number) => {
    if (picked !== null) return;
    tap();
    setPicked(n);
    if (n === q.answer) setRight((r) => r + 1);
  };
  const next = () => {
    if (i + 1 === total) p.finish(Math.round((right / total) * 100));
    setPicked(null);
    setI((n) => n + 1);
  };

  return (
    <main className="page">
      <TopBar title="Quiz" back={p.done} right={`${i + 1} / ${total}`} />
      <h1 className="question">{q.card.front}</h1>
      <div className="options">
        {q.options.map((o, n) => {
          const cls = picked === null ? "" : n === q.answer ? "right" : n === picked ? "wrong" : "dim";
          return (
            <button key={o} className={`option ${cls}`} onClick={() => pick(n)} disabled={picked !== null}>
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button className="primary" onClick={next}>
          {i + 1 === total ? "See my score" : "Next"}
        </button>
      )}
    </main>
  );
}

function About({ back }: { back: () => void }) {
  return (
    <main className="page">
      <TopBar title="" back={back} />
      <header className="deck-head">
        <span className="big-emoji" aria-hidden="true">
          🩺
        </span>
        <h1>Scrub Deck</h1>
        <p className="muted">Version {__APP_VERSION__}</p>
      </header>
      <section className="prose">
        <p>
          Quick study cards for nursing school: vital signs, lab values, drug name endings, antidotes, and chart
          shorthand. Flip through a deck, quiz yourself, and keep a daily streak.
        </p>
        <p>
          <strong>Built by Violet</strong>, a nursing student, with her dad.
        </p>
        <h2 className="section">For study only</h2>
        <p>
          Scrub Deck is a study aid, not medical advice and not a clinical reference. Reference ranges differ between
          labs, textbooks, and facilities. Always go by your course materials, your instructor, and your facility's
          policy.
        </p>
        <h2 className="section">Privacy</h2>
        <p>
          Everything you do here stays on this device. There is no account, no tracking, and nothing is sent anywhere.
        </p>
      </section>
    </main>
  );
}
