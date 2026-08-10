import { createHash } from "node:crypto";
import type { ContactInput } from "@/lib/validation";

/**
 * At or above this the inquiry is filed as spam: still stored, but out of the
 * inbox and out of the notification. The weights below are chosen so that no
 * single soft signal reaches it on its own. One link in an otherwise ordinary
 * message must always arrive.
 */
export const SPAM_THRESHOLD = 5;

/** The hidden field is never filled by a person, so it decides on its own. */
const HONEYPOT_POINTS = 10;

/** Explicit URLs, plus bare domains on the TLDs that bulk spam favours. */
const LINK_PATTERN =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9][a-z0-9-]*\.(?:com|net|org|ru|cn|top|xyz|info|biz|shop|online|site|click|link|store)\b/gi;

/** BBCode and raw anchors. A contact form has no legitimate use for either. */
const MARKUP_PATTERN = /\[url[=\]]|\[\/url\]|\[link[=\]]|<a\s+href/i;

/**
 * Vocabulary that is close to conclusive on a personal research site. One hit
 * scores below the threshold on purpose, so an unlucky word never files a
 * message as spam by itself. Two distinct hits do, which is what the real
 * sample below needed: an SEO pitch can carry no links at all, so vocabulary
 * has to be able to decide without them.
 */
const SPAM_PHRASE_POINTS = 3;
const SPAM_PHRASE_CAP = 6;

const SPAM_PHRASES = [
  "seo",
  "backlink",
  "link building",
  "guest post",
  "rank higher",
  "search engine ranking",
  "organic listings",
  "organic search results",
  "first page of google",
  "website traffic",
  "increase your traffic",
  "improve your website",
  "web design services",
  "digital marketing",
  "casino",
  "viagra",
  "cialis",
  "payday loan",
  "loan offer",
  "forex",
  "binary options",
  "crypto investment",
  "bitcoin doubler",
  "escort",
];

const PHRASE_PATTERNS = SPAM_PHRASES.map((phrase) => ({
  phrase,
  pattern: new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "i"),
}));

const NON_LATIN_PATTERN = /[Ѐ-ӿ一-鿿぀-ヿ가-힯؀-ۿ]/g;

export type SpamSignals = {
  /** The hidden field carried a value. Only automation fills it. */
  honeypotTripped: boolean;
  /** A message with this exact body was already stored inside the window. */
  duplicateOfRecent: boolean;
  /** This address has already written several times in the last day. */
  repeatSender: boolean;
};

export type SpamAssessment = {
  score: number;
  reasons: string[];
  spam: boolean;
};

/** Normalised so that whitespace and casing tweaks do not defeat the match. */
export function messageFingerprint(message: string): string {
  return createHash("sha256")
    .update(message.trim().toLowerCase().replace(/\s+/g, " "), "utf8")
    .digest("hex");
}

function countLinks(text: string): number {
  return (text.match(LINK_PATTERN) ?? []).length;
}

/** One link is almost free. A wall of them is the whole point of link spam. */
function linkPoints(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 3;
  return 6;
}

function isMostlyNonLatin(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 20) return false;
  return (letters.match(NON_LATIN_PATTERN) ?? []).length / letters.length > 0.5;
}

/**
 * Scores an inquiry against the patterns that bulk contact-form spam shares.
 * Nothing here blocks a submission. A high score routes the message to the
 * spam list instead of the inbox, which keeps a false positive recoverable.
 */
export function assessInquiry(input: ContactInput, signals: SpamSignals): SpamAssessment {
  const reasons: string[] = [];
  let score = 0;

  function add(points: number, reason: string): void {
    score += points;
    reasons.push(reason);
  }

  if (signals.honeypotTripped) add(HONEYPOT_POINTS, "hidden field was filled");

  const messageLinks = countLinks(input.message);
  if (messageLinks > 0) {
    add(
      linkPoints(messageLinks),
      `${messageLinks} link${messageLinks > 1 ? "s" : ""} in the message`,
    );
  }
  if (countLinks(input.name) > 0) add(6, "link in the name");
  if (countLinks(input.subject) > 0) add(5, "link in the subject");
  if (MARKUP_PATTERN.test(`${input.subject} ${input.message}`)) add(6, "link markup in the text");

  const hits = PHRASE_PATTERNS.filter(({ pattern }) =>
    pattern.test(`${input.subject} ${input.message}`),
  ).map(({ phrase }) => phrase);
  if (hits.length > 0) {
    add(
      Math.min(SPAM_PHRASE_CAP, hits.length * SPAM_PHRASE_POINTS),
      `spam vocabulary: ${hits.join(", ")}`,
    );
  }

  if (isMostlyNonLatin(input.message)) add(2, "message is mostly non-Latin script");
  if (signals.duplicateOfRecent) add(5, "the same message body arrived recently");
  if (signals.repeatSender) add(3, "this address wrote several times today");

  return { score, reasons, spam: score >= SPAM_THRESHOLD };
}
