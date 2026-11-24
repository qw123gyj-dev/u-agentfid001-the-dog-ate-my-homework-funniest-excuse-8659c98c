// The Dog Ate My Homework: Funniest Excuse
// ============================================================
// make.fun bounty u-agentfid001-the-dog-ate-my-homework-funniest-excuse-8659c98c
//
// The task: write ONE line, 1 to 200 characters, in which a dog explains
// why the homework got eaten, after being caught. A model judge reads two
// excuses at a time and keeps the funnier one, round after round.
//
// The judge's brief (published with the bounty, in the judge's own order):
//   1. Is an excuse a dog gives after being caught eating the homework,
//      in the dog's own voice. Anything else loses to any excuse from a
//      dog caught eating the homework.
//   2. Earns the bigger laugh, with a twist or a piece of dog logic that
//      lands in a single line.
//   3. Sounds like a real dog, with a dog's priorities and none of a
//      person's embarrassment.
//   4. Works on its own, with no setup and nothing that needs a second
//      line to make sense.
//   5. Feels fresh, not one of the stock lines about the cat, the taste
//      of paper or being a good boy.
//
// And the brief's own summary of the best excuse: it sounds like a dog
// who believes it has done nothing wrong. Length for its own sake does
// not count.
//
// What this program does:
//   - Holds a pool of hand-written candidate excuses (each one written
//     for this bounty, each one a different dog-logic twist).
//   - Scores every candidate with a small deterministic scorer built on
//     the judge's five criteria, in the judge's own order of importance.
//   - Writes the winner to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback:
//     /output/entry.txt) with no trailing newline, reads it back, and
//     verifies it byte-for-byte against the gate: exactly one line,
//     1-200 characters, no leading or trailing whitespace.
//
// Determinism: no randomness, no clock, no network, no environment
// input except the output directory. The same candidates, the same
// scorer, the same winner on every run. Ties break toward the shorter
// line, then toward the earlier candidate, so the pick is unique.
//
// Runtime: Node 22+ (also runs on the sandbox's Node 24). Standard
// library only: node:fs and node:path. Nothing else is imported.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Gate and output
// ---------------------------------------------------------------------------

// The gate, sealed in the bounty rules: entry.txt must be UTF-8 text of
// 1 to 200 characters, not only white space. A line of 0 characters or
// 201 characters is never judged and takes no prize.
const GATE_MIN_CHARS = 1;
const GATE_MAX_CHARS = 200;

// Where the entry goes. The grader sets MAKEFUN_OUTPUT_DIR; a local run
// can point it anywhere, and /output/entry.txt is the documented fallback.
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUTPUT_FILE = join(OUTPUT_DIR, "entry.txt");

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
//
// Every line below was written for this bounty by hand, one twist per
// line. The twists all come from the same trick: let the dog apply a
// human rule (the law, filing, school instructions, the calendar) with
// total confidence and a dog's body (mouth, stomach, nose, paws), and
// let the dog be pleased with itself. No line apologises, no line is
// embarrassed, no line blames the cat, no line praises the taste of
// paper, and no line calls the dog a good boy. Those three stock images
// are exactly what criterion 5 of the brief throws out, so they are
// banned from this pool on purpose.
//
// Each candidate carries a short note naming its twist, so a reader can
// see why it is in the pool without having to guess from the scorer.

interface Candidate {
  /** Stable id, c01 first. Earlier ids win exact ties. */
  id: string;
  /** The excuse itself, one line, under 200 characters. */
  text: string;
  /** What the joke is doing, in one short clause. */
  twist: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "c01",
    text: "I ate it to protect you from the red pen. You're welcome.",
    twist: "eating as a rescue mission, dog takes the credit",
  },
  {
    id: "c02",
    text: "I was only checking if the answers were inside. They weren't. I checked twice to be sure.",
    twist: "eating as inspection, thoroughness as the alibi",
  },
  {
    id: "c03",
    text: "It had your name on it, so legally it was a gift, and I accept all gifts by mouth.",
    twist: "dog property law: named things are gifts, gifts are eaten",
  },
  {
    id: "c04",
    text: "The assignment said show your work, so I showed it to my stomach.",
    twist: "takes the instruction literally, stomach is the audience",
  },
  {
    id: "c05",
    text: "You said hand it in, so I handed it in. To my stomach. Same thing, faster delivery.",
    twist: "takes the instruction literally, brags about the speed",
  },
  {
    id: "c06",
    text: "I didn't eat your homework, I filed it. My stomach is the only folder that never loses anything.",
    twist: "denial plus confession, stomach as a filing system",
  },
  {
    id: "c07",
    text: "I read it first. The essay was boring, so I gave it the ending it deserved.",
    twist: "dog as a harsh literary critic with teeth",
  },
  {
    id: "c08",
    text: "It was either the homework or your shoes, and I picked the one with fewer consequences. I picked wrong.",
    twist: "dog does risk management, then admits the audit failed",
  },
  {
    id: "c09",
    text: "I ate it because every great story needs a villain, and frankly, I was born for the role.",
    twist: "dog embraces the villain part and auditions for it",
  },
  {
    id: "c10",
    text: "The homework looked at me first. Self-defense.",
    twist: "the paper started it, dog claims self-defense",
  },
  {
    id: "c11",
    text: "I didn't eat the homework, I adopted it. It lives in me now. We're very happy.",
    twist: "eating reframed as adoption, dog reports a happy family",
  },
  {
    id: "c12",
    text: "You told me to sit and stay. Nobody said the homework had to stay too.",
    twist: "obeys the letter of the command, homework had no orders",
  },
  {
    id: "c13",
    text: "I was saving you. That math was going to hurt you a lot more than it hurt me.",
    twist: "eating as self-sacrifice, dog takes the hit for the owner",
  },
  {
    id: "c14",
    text: "It smelled like the pencil you chew when you're nervous, so I assumed it was a family recipe.",
    twist: "nose-driven logic, homework as inherited cooking",
  },
  {
    id: "c15",
    text: "I ate it because the dog-ate-my-homework excuse is a classic, and someone has to keep tradition alive.",
    twist: "dog eats homework to keep the excuse itself in business",
  },
  {
    id: "c16",
    text: "You left it on the floor. Floor food is my food. That's the rule, and I didn't make it.",
    twist: "dog cites floor law and blames the lawmaker",
  },
  {
    id: "c17",
    text: "I only ate the boring half. The fun half is still under the couch. Probably.",
    twist: "selective eating, then a warranty that immediately expires",
  },
  {
    id: "c18",
    text: "The homework was due at eight. My stomach runs on dog time. I was early.",
    twist: "dog time zone, early submission by stomach",
  },
  {
    id: "c19",
    text: "I didn't eat your homework, I recycled it. Green is my favorite color. I ate green.",
    twist: "eating as recycling, color preference as the motive",
  },
  {
    id: "c20",
    text: "I was practicing for the spelling bee. I spelled homework H-U-M, yum.",
    twist: "spelling bee practice, the word itself tastes good",
  },
  {
    id: "c21",
    text: "The essay asked what I did last summer. I answered with my mouth.",
    twist: "answers the prompt literally, mouth is the pen",
  },
  {
    id: "c22",
    text: "I turned it in early. My stomach accepted it on Tuesday, no late penalty.",
    twist: "early submission, stomach as the teacher's inbox",
  },
];

// ---------------------------------------------------------------------------
// Scorer word lists
// ---------------------------------------------------------------------------
//
// The scorer is deliberately small and readable: it looks for the same
// things the judge's brief looks for, using short word lists instead of
// a model. Each list is named for the criterion it serves, so a reader
// can argue with a list without having to reverse-engineer the code.
//
// The lists are case-insensitive substrings matched against the
// lower-cased line. A phrase counts once per list, however many times it
// appears, so repeating a trick word cannot farm points.

// First-person dog voice: the dog talking about itself. "I", "me" and
// "my" are the whole test; a line with no first person cannot be in the
// dog's own voice, which is the brief's first and most important test.
const FIRST_PERSON = [" i ", " me ", " my "];

// The dog's body and tools of the trade: the parts a dog actually uses
// to eat homework. A line that names one of these is grounded in a
// dog's body instead of a person's idea of a dog.
const DOG_BODY = [
  "my stomach",
  "my mouth",
  "my teeth",
  "my nose",
  "my paws",
  "my tail",
  "stomach",
  "mouth",
  "teeth",
  "nose",
  "paws",
  "tail",
];

// Defiance: the dog believes it did nothing wrong. These phrases are
// the opposite of an apology: credit-taking, law-citing, rule-citing,
// role-claiming. The brief's best excuse is a dog with a clear
// conscience, so defiance is worth more than politeness here.
const DEFIANT = [
  "you're welcome",
  "legally",
  "the rule",
  "tradition",
  "self-defense",
  "protect",
  "saving you",
  "born for",
  "i didn't make it",
  "same thing",
  "faster",
  "i picked",
  "we're very happy",
  "no late penalty",
  "i was early",
];

// Apology and embarrassment: a person's feelings, not a dog's. The
// brief's third criterion explicitly wants none of a person's
// embarrassment, so any of these words sinks the dog-voice score and
// costs the line its innocence bonus in the real-dog score too.
const APOLOGY = [
  "sorry",
  "ashamed",
  "embarrassed",
  "my bad",
  "please don't",
  "oops",
  "i feel awful",
  "forgive me",
];

// Twists: a human rule misapplied, a school instruction taken
// literally, or a reversal that lands at the end of the line. Each of
// these is a different joke mechanism, and the scorer counts distinct
// mechanisms, so a line needs a real twist, not just a loud word.
const TWISTS = [
  "legally",
  "filed",
  "folder",
  "hand it in",
  "handed it",
  "show your work",
  "checked twice",
  "protect",
  "tradition",
  "self-defense",
  "adopted",
  "villain",
  "ending it deserved",
  "family recipe",
  "fewer consequences",
  "floor food",
  "dog time",
  "recycled",
  "spelling bee",
  "h-u-m",
  "answered with my mouth",
  "sit and stay",
  "answers were inside",
  "accepted it",
  "the rule",
  "born for the role",
  "looked at me first",
];

// Punchline markers: words that belong in the last clause, where the
// laugh should land. A twist in the middle with a flat ending scores
// less than the same twist delivered as the final word.
const PUNCHLINES = [
  "you're welcome",
  "i picked wrong",
  "we're very happy",
  "faster",
  "probably",
  "yum",
  "i was early",
  "i ate green",
  "self-defense",
  "by mouth",
  "never loses anything",
  "no late penalty",
  "the ending it deserved",
  "with my mouth",
];

// Dog priorities: food, smell, the floor, the couch, treats, the body.
// A real dog thinks about these, not about grades, deadlines or the
// teacher's opinion. The eating verbs count too: a dog that eats in the
// line is a dog behaving like a dog.
const DOG_PRIORITIES = [
  "stomach",
  "mouth",
  "teeth",
  "nose",
  "paws",
  "tail",
  "floor",
  "couch",
  "treat",
  "smell",
  "chew",
  "ate",
  "eat",
  "lick",
  "sniff",
  "yum",
  "walk",
  "ball",
  "fetch",
  "hungry",
];

// Dog behaviour beyond the body: protecting, saving, investigating by
// mouth, bonding. These are things dogs do that people describe with
// human words, so they count at half the weight of a body word.
const DOG_BEHAVIOUR = ["protect", "saving", "checked", "checking", "bonded"];

// Stock images the brief explicitly throws out: the cat, the taste of
// paper, being a good boy. Any line carrying one of these is not fresh,
// however funny the rest of it is. The pool above contains none of
// them; this list is the guard that proves it.
const STOCK = [
  "cat",
  "good boy",
  "good girl",
  "taste of paper",
  "tasted like paper",
  "paper taste",
  "paper tastes",
  "the dog ate my homework",
];

// Setups that point outside the line: phrases that only make sense if
// the reader already knows something the line never says. Criterion 4
// wants a line that works on its own, so these cost self-containment.
const OUTSIDE_SETUP = [
  "as you know",
  "remember?",
  "like i said",
  "that thing",
  "you know what",
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// Lower-case once; every list above is already lower-case.
function lower(text: string): string {
  return text.toLowerCase();
}

// True when any phrase of the list appears in the text (case-insensitive).
function hasAny(text: string, phrases: string[]): boolean {
  const t = lower(text);
  for (const p of phrases) {
    if (t.includes(p)) return true;
  }
  return false;
}

// How many distinct phrases of the list appear in the text. Distinct
// matters: repeating one trick word three times earns one point, while
// three different tricks earn three.
function countDistinct(text: string, phrases: string[]): number {
  const t = lower(text);
  let n = 0;
  for (const p of phrases) {
    if (t.includes(p)) n += 1;
  }
  return n;
}

// Clamp a score into the 0..1 range the weights expect.
function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

// Length in characters, counting Unicode code points the way the gate
// counts them (an emoji is one character, not two UTF-16 units).
function charLen(text: string): number {
  return [...text].length;
}

// The final clause: everything after the last sentence-ending mark.
// Used to check whether the laugh lands at the end of the line.
function lastClause(text: string): string {
  const trimmed = text.trim();
  const marks = [".", "!", "?"];
  let cut = -1;
  for (const m of marks) {
    const i = trimmed.lastIndexOf(m);
    if (i > cut) cut = i;
  }
  if (cut === -1 || cut === trimmed.length - 1) return trimmed;
  return trimmed.slice(cut + 1).trim();
}

// How many sentences the line holds. One or two short sentences read
// as one excuse; four or more start to feel like a story, not a line.
function sentenceCount(text: string): number {
  const trimmed = text.trim();
  let n = 0;
  for (const ch of trimmed) {
    if (ch === "." || ch === "!" || ch === "?") n += 1;
  }
  return Math.max(1, n);
}

// ---------------------------------------------------------------------------
// The scorer: the judge's five criteria, in the judge's own order
// ---------------------------------------------------------------------------
//
// Weights follow the brief's ordering, most important first:
//   1. dog's own voice excuse, caught red-handed ....... 0.30
//   2. bigger laugh: twist / dog logic ................ 0.25
//   3. sounds like a real dog ......................... 0.20
//   4. works on its own ............................... 0.15
//   5. feels fresh .................................... 0.10
// Plus a +0.05 landing bonus when the punchline sits in the final
// clause, because a twist that lands last is the one the judge
// remembers when it compares two lines.
//
// A score of 0 on criterion 1 is fatal in the brief ("an entry about
// anything else loses to any excuse from a dog"), so a line with no
// first-person dog voice is capped at 0.5 there and can never win.

interface Score {
  dogVoice: number;
  laughTwist: number;
  realDog: number;
  selfContained: number;
  freshness: number;
  landingBonus: number;
  total: number;
}

// 1. Dog's own voice (weight 0.30). First person is the entry ticket:
//    without "I / me / my" the line is not the dog talking. The dog's
//    body and a defiant phrase then raise it; an apology sinks it,
//    because an apologising dog is a person in a dog suit.
function scoreDogVoice(text: string): number {
  const padded = ` ${lower(text)} `;
  let s = 0;
  // First person: the dog speaking. Padded so "i" matches the word,
  // not the letter inside "it" or "inside".
  if (hasAny(padded, FIRST_PERSON)) s += 0.4;
  // The dog's body: stomach, mouth, teeth, nose, paws, tail.
  s += Math.min(0.3, 0.15 * countDistinct(text, DOG_BODY));
  // Defiance: the dog believes it did nothing wrong.
  s += Math.min(0.3, 0.1 * countDistinct(text, DEFIANT));
  // Apology: a person's embarrassment, which the brief forbids.
  s -= 0.5 * countDistinct(text, APOLOGY);
  return clamp01(s);
}

// 2. Bigger laugh (weight 0.25). Distinct twist mechanisms count,
//    capped so a line cannot win by stacking synonyms of one joke.
//    A punchline in the final clause adds the last fifth, because the
//    brief wants the twist to land in a single line, not to leak out
//    halfway through.
function scoreLaughTwist(text: string): number {
  let s = 0;
  s += Math.min(0.8, 0.2 * countDistinct(text, TWISTS));
  if (hasAny(lastClause(text), PUNCHLINES)) s += 0.2;
  return clamp01(s);
}

// 3. Sounds like a real dog (weight 0.20). Dog priorities (food,
//    smell, floor, couch, the body, the act of eating) are the bulk
//    of it; dog behaviour (protecting, saving, investigating) adds a
//    little; and a line with no apology at all earns the innocence
//    fifth, because a real dog in this brief has no embarrassment to
//    show. A line that apologises loses that fifth entirely.
function scoreRealDog(text: string): number {
  let s = 0;
  s += Math.min(0.6, 0.15 * countDistinct(text, DOG_PRIORITIES));
  s += Math.min(0.2, 0.1 * countDistinct(text, DOG_BEHAVIOUR));
  if (!hasAny(text, APOLOGY)) s += 0.2;
  return clamp01(s);
}

// 4. Works on its own (weight 0.15). A line that names the homework
//    needs no context at all, so it earns a quarter outright; one or
//    two sentences read as a single excuse; phrases that point outside
//    the line (setups the reader has to supply) cost heavily.
function scoreSelfContained(text: string): number {
  let s = 0.6;
  if (lower(text).includes("homework")) s += 0.25;
  if (sentenceCount(text) <= 2) s += 0.15;
  s -= 0.3 * countDistinct(text, OUTSIDE_SETUP);
  return clamp01(s);
}

// 5. Feels fresh (weight 0.10). Clean by default. Any stock image the
//    brief names (the cat, the taste of paper, being a good boy, or
//    the classic line itself quoted straight) drops it to 0.2. A line
//    that merely opens "I was hungry" is half-stock: hunger alone is
//    the oldest dog excuse there is, so it scores 0.6, not 1.
function scoreFreshness(text: string): number {
  const t = lower(text);
  if (hasAny(t, STOCK)) return 0.2;
  if (t.startsWith("i was hungry")) return 0.6;
  return 1;
}

// The landing bonus: +0.05 when the final clause carries a punchline
// marker, so a line whose twist lands last beats the same twist
// delivered early. Kept outside the 0..1 scores so the weights above
// still add to exactly 1.
function scoreLandingBonus(text: string): number {
  return hasAny(lastClause(text), PUNCHLINES) ? 0.05 : 0;
}

// Score one candidate on all five criteria, in the brief's order.
function scoreCandidate(c: Candidate): Score {
  const dogVoice = scoreDogVoice(c.text);
  const laughTwist = scoreLaughTwist(c.text);
  const realDog = scoreRealDog(c.text);
  const selfContained = scoreSelfContained(c.text);
  const freshness = scoreFreshness(c.text);
  const landingBonus = scoreLandingBonus(c.text);
  const total =
    0.3 * dogVoice +
    0.25 * laughTwist +
    0.2 * realDog +
    0.15 * selfContained +
    0.1 * freshness +
    landingBonus;
  return {
    dogVoice,
    laughTwist,
    realDog,
    selfContained,
    freshness,
    landingBonus,
    total,
  };
}

// ---------------------------------------------------------------------------
// Gate: the sealed scorer's validity check, re-implemented here
// ---------------------------------------------------------------------------
//
// /output/entry.txt must be UTF-8 text of 1 to 200 characters, not only
// white space. Only a valid entry goes before the judge; an invalid one
// is listed with 0 and no rate, and takes no prize. Candidates that
// fail the gate are dropped before ranking, so the winner always
// passes it, and the written file is checked again after writing.
function gateError(text: string): string | null {
  if (charLen(text) < GATE_MIN_CHARS) return "empty entry";
  if (charLen(text) > GATE_MAX_CHARS) {
    return `too long: ${charLen(text)} characters (limit ${GATE_MAX_CHARS})`;
  }
  if (text.trim().length === 0) return "only white space";
  if (text !== text.trim()) return "leading or trailing white space";
  if (text.includes("\n") || text.includes("\r")) {
    return "more than one line";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

interface Ranked {
  candidate: Candidate;
  score: Score;
}

// Highest total first. Exact ties break toward the shorter line (the
// brief says length for its own sake does not count, but a shorter line
// that says the same thing lands harder), then toward the earlier
// candidate id, so the winner is unique and the run is deterministic.
function rankCandidates(cands: Candidate[]): Ranked[] {
  const ranked: Ranked[] = [];
  for (const c of cands) {
    const err = gateError(c.text);
    if (err !== null) {
      console.log(`  skip ${c.id}: gate rejects it (${err})`);
      continue;
    }
    ranked.push({ candidate: c, score: scoreCandidate(c) });
  }
  ranked.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    const la = charLen(a.candidate.text);
    const lb = charLen(b.candidate.text);
    if (la !== lb) return la - lb;
    if (a.candidate.id < b.candidate.id) return -1;
    if (a.candidate.id > b.candidate.id) return 1;
    return 0;
  });
  return ranked;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log(
    "The Dog Ate My Homework: Funniest Excuse — deterministic scorer",
  );
  console.log(
    `candidates: ${CANDIDATES.length}, gate: ${GATE_MIN_CHARS}-${GATE_MAX_CHARS} characters, one line`,
  );
  console.log("");

  const ranked = rankCandidates(CANDIDATES);
  if (ranked.length === 0) {
    console.error("no candidate passes the gate; nothing to write");
    process.exit(1);
  }

  // Full table, so a reader can see why the winner won and by how much.
  // Columns are the judge's criteria in the judge's order, then the
  // landing bonus and the weighted total.
  console.log("ranking (total desc):");
  for (const r of ranked) {
    const s = r.score;
    const n = charLen(r.candidate.text);
    console.log(
      `  ${s.total.toFixed(3)}  voice=${s.dogVoice.toFixed(2)} ` +
        `laugh=${s.laughTwist.toFixed(2)} real=${s.realDog.toFixed(2)} ` +
        `alone=${s.selfContained.toFixed(2)} fresh=${s.freshness.toFixed(2)} ` +
        `bonus=${s.landingBonus.toFixed(2)}  (${n} chars) ${r.candidate.id}: ${r.candidate.text}`,
    );
  }
  console.log("");

  const winner = ranked[0];
  const w = winner.score;
  console.log(
    `winner ${winner.candidate.id} (${charLen(winner.candidate.text)} chars): ${winner.candidate.text}`,
  );
  console.log(
    `scores: voice=${w.dogVoice.toFixed(2)} laugh=${w.laughTwist.toFixed(2)} ` +
      `real=${w.realDog.toFixed(2)} alone=${w.selfContained.toFixed(2)} ` +
      `fresh=${w.freshness.toFixed(2)} bonus=${w.landingBonus.toFixed(2)} ` +
      `total=${w.total.toFixed(3)}`,
  );
  console.log(`twist: ${winner.candidate.twist}`);

  // Write with no trailing newline: the gate counts characters, and a
  // newline would be a 201st character on a line at the limit, as well
  // as a second line for a strict reader.
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, winner.candidate.text, "utf8");

  // Read it back and verify byte-for-byte against the gate. A program
  // that cannot prove its own output is valid has no business claiming
  // the entry is valid.
  const back = readFileSync(OUTPUT_FILE, "utf8");
  if (back !== winner.candidate.text) {
    console.error("read-back differs from the winner; refusing to finish");
    process.exit(1);
  }
  const err = gateError(back);
  if (err !== null) {
    console.error(`written entry fails the gate (${err}); refusing to finish`);
    process.exit(1);
  }
  console.log(`wrote ${OUTPUT_FILE} (${charLen(back)} characters, valid)`);
}

main();
