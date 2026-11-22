/**
 * Spam-classifier smoke test. Runs no server and touches no database: it feeds
 * the scorer fixed inquiries and asserts which side of the threshold they land
 * on. The legitimate cases matter more than the spam ones. A filter that eats
 * real mail is worse than one that lets a link farm through.
 *
 * Usage: npx tsx scripts/smoke-spam-filter.ts
 */

import { SPAM_THRESHOLD, assessInquiry, messageFingerprint } from "../src/lib/spam-score";
import type { SpamSignals } from "../src/lib/spam-score";

type Case = {
  label: string;
  input: { name: string; email: string; subject: string; message: string };
  signals?: Partial<SpamSignals>;
  expectSpam: boolean;
};

const NO_SIGNALS: SpamSignals = {
  honeypotTripped: false,
  duplicateOfRecent: false,
  repeatSender: false,
};

const CASES: Case[] = [
  {
    label: "plain research enquiry",
    input: {
      name: "Anna Weber",
      email: "a.weber@ethz.ch",
      subject: "Question about your workshop paper",
      message:
        "Hello, I read your paper on trusted execution and had a question about the threat model in section 4. Would you have time for a short call next week?",
    },
    expectSpam: false,
  },
  {
    label: "legitimate enquiry citing one link",
    input: {
      name: "Marco Bianchi",
      email: "marco@uni-trento.it",
      subject: "Collaboration on network protocol security",
      message:
        "We work on a similar problem. Our preprint is at https://arxiv.org/abs/2401.01234 and I would value your view on the timing argument.",
    },
    expectSpam: false,
  },
  {
    label: "student mail with two links",
    input: {
      name: "Jonas Keller",
      email: "jonas.keller@tum.de",
      subject: "Thesis supervision",
      message:
        "I am looking for a thesis topic. My transcript is at https://example.org/transcript and my GitHub is https://github.com/jkeller if that helps.",
    },
    expectSpam: false,
  },
  {
    label: "German enquiry, no links",
    input: {
      name: "Petra Schmidt",
      email: "p.schmidt@fraunhofer.de",
      subject: "Anfrage zu Ihrem Vortrag",
      message:
        "Guten Tag, ich habe Ihren Vortrag zur Fahrzeugsicherheit gehoert und wuerde gerne mehr ueber das Relay-Kit erfahren. Haetten Sie Zeit fuer ein Gespraech?",
    },
    expectSpam: false,
  },
  {
    label: "one unlucky word must not be enough",
    input: {
      name: "Rita Hoffmann",
      email: "rita@example.edu",
      subject: "Forex fraud detection research",
      message:
        "I am researching fraud detection in forex trading platforms and wondered whether your embedded-security work applies to the hardware tokens these platforms ship.",
    },
    expectSpam: false,
  },
  {
    // The one message that actually reached the production inbox, on
    // 2026-08-10. It carries no links at all, which is why vocabulary alone
    // has to be able to decide. Sender details are not reproduced here.
    label: "real sample: linkless SEO pitch that reached production",
    input: {
      name: "Brianna Belton",
      email: "sender@example.com",
      subject: "Re: Improve your website traffic and SEO",
      message:
        "Hello there,\n\nI came across your Website, when searching on Google and noticed that you do not show in the organic listings.\n\nWe help businesses rank higher on Google while also increasing their presence on AI-powered search platforms.",
    },
    expectSpam: true,
  },
  {
    label: "SEO backlink spam",
    input: {
      name: "Digital Growth",
      email: "sales@growth-agency.top",
      subject: "Rank higher on Google",
      message:
        "We offer link building and guest post placements to increase your traffic. Visit https://growth-agency.top and https://cheap-backlinks.xyz and https://seo-boost.online today!",
    },
    expectSpam: true,
  },
  {
    label: "link in the name field",
    input: {
      name: "https://buy-now.shop",
      email: "bot@mail.ru",
      subject: "Hello",
      message: "Please check out our great offer for your business today, best regards.",
    },
    expectSpam: true,
  },
  {
    label: "BBCode payload",
    input: {
      name: "Viktor",
      email: "viktor@example.net",
      subject: "Partnership",
      message: "Great site! [url=http://spam.example]click here[/url] for a special partnership.",
    },
    expectSpam: true,
  },
  {
    label: "honeypot decides on its own",
    input: {
      name: "Sarah Klein",
      email: "sarah@example.com",
      subject: "Question",
      message: "This body is entirely innocent and would otherwise score zero points at all.",
    },
    signals: { honeypotTripped: true },
    expectSpam: true,
  },
  {
    label: "replayed body",
    input: {
      name: "Alex",
      email: "alex@example.com",
      subject: "Hi",
      message: "Nice website, I wanted to reach out about a business opportunity for you.",
    },
    signals: { duplicateOfRecent: true },
    expectSpam: true,
  },
];

let failures = 0;

for (const testCase of CASES) {
  const signals = { ...NO_SIGNALS, ...testCase.signals };
  const { score, spam, reasons } = assessInquiry(testCase.input, signals);
  const ok = spam === testCase.expectSpam;
  if (!ok) failures++;
  const verdict = spam ? "SPAM" : "ok";
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${verdict.padEnd(4)} score ${String(score).padStart(2)}  ${testCase.label}` +
      (reasons.length > 0 ? `\n            ${reasons.join("; ")}` : ""),
  );
}

// The fingerprint has to ignore the cosmetic edits a campaign varies.
const base = messageFingerprint("Buy our product now, best price guaranteed.");
const reformatted = messageFingerprint("  Buy our   product NOW, best price guaranteed.  ");
if (base !== reformatted) {
  console.log("FAIL  fingerprint changed under whitespace and casing edits");
  failures++;
} else {
  console.log("PASS  fingerprint survives whitespace and casing edits");
}

const different = messageFingerprint("A completely different message body entirely.");
if (base === different) {
  console.log("FAIL  fingerprint collided across different bodies");
  failures++;
} else {
  console.log("PASS  fingerprint differs across different bodies");
}

console.log(`\nthreshold ${SPAM_THRESHOLD}, ${CASES.length + 2} checks, ${failures} failing`);
if (failures > 0) process.exit(1);
