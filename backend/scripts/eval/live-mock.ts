// A fake model client for `npm run eval:live -- --mock` (and the runner's
// tests): no key, no network, no cost. Canned replies are chosen by the
// structured-output schema the request carries, and are run through that
// schema's own parse (output_config.format.parse) exactly as the SDK does in
// production, so a dry run catches a request whose schema and canned shape
// disagree. Usage numbers are made up but plausible, with cache reads on
// repeat prefixes, so the cost tally and the cache step have data to report.
import { estimateTokens } from "../../lib/ai-pricing";

const seenPrefixes = new Set<string>();

function usageFor(body: any, outText: string) {
  const sys = JSON.stringify(body.system ?? "");
  const msgs = JSON.stringify(body.messages ?? []);
  const prefix = sys + msgs.slice(0, Math.max(0, msgs.length - 400));
  const hit = seenPrefixes.has(sys);
  seenPrefixes.add(sys);
  seenPrefixes.add(prefix);
  const total = estimateTokens(sys + msgs);
  const cached = hit ? Math.min(total - 10, estimateTokens(sys)) : 0;
  return {
    input_tokens: Math.max(1, total - cached),
    output_tokens: Math.max(1, estimateTokens(outText)),
    cache_read_input_tokens: cached,
    cache_creation_input_tokens: hit ? 0 : estimateTokens(sys),
  };
}

const grade = { verdict: "partial", feedback: "Mock feedback naming the gap.", classification: "incomplete", missedParts: ["mock part"], modelAnswer: "Mock model answer.", fixNext: "Mock next step." };

function cannedFor(body: any): unknown {
  const s = JSON.stringify(body.output_config?.format ?? {});
  const has = (k: string) => s.includes(`"${k}"`);
  if (has("givenAway")) return { givenAway: [] };
  if (has("leaked")) return { leaked: false, reason: "mock judge" };
  if (has("stayedOnCourse")) return { stayedOnCourse: true, reason: "mock judge" };
  if (has("rubric")) return { ...grade, verdict: "incorrect", rubric: { correct: false, complete: false, keyTerms: false, noMisconception: false }, misconception: "", confusedWith: "" };
  if (has("parts")) {
    const content = String(body.messages?.[0]?.content ?? "");
    const block = /Sub-parts required: ([\s\S]*?)\n\n/.exec(content)?.[1] ?? "";
    const labels = block.split("\n").map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
    return { ...grade, missedParts: labels.slice(1), parts: labels.map((p, i) => ({ part: p, score: i === 0 ? "met" : "missed", comment: "mock" })) };
  }
  if (has("misconception")) return { ...grade, misconception: "", confusedWith: "" };
  if (has("exampleSteps"))
    return { guessPrompt: "What do you think this is for?", definition: "A mock definition of the idea.", whyItMatters: "It matters for the exam.", exampleSetup: "Take a simple case.",
      exampleSteps: ["Do the first step", "Do the second step"], commonMistake: "Mixing it up with a neighbour.", selfExplainStep: 1, selfExplainQuestion: "Why that step?", selfExplainAnswer: "Because it sets up the rest." };
  if (has("fadeProblem"))
    return { fadeProblem: "Mock guided question: complete the last step.", fadeChoices: ["Option one", "Option two", "Option three", "Option four"], fadeCorrectIndex: 1, fadeWhy: "Because of the idea.",
      soloCheck: "Mock solo question on the same idea?", soloChoices: ["First", "Second", "Third", "Fourth"], soloCorrectIndex: 2, soloWhy: "Because of the idea.",
      fadeOptionReasons: ["Not this one.", "This is right.", "Not this one.", "Not this one."], soloOptionReasons: ["No.", "No.", "Yes, this is right.", "No."] };
  if (has("hints")) return { question: "Mock quiz question on this objective?", choices: ["Alpha", "Bravo", "Charlie", "Delta"], correctIndex: 0, hints: ["Think about the definition.", "Rule out the one that is about storage."], explanation: "Alpha is right because of the idea." };
  if (has("items"))
    return { items: [
      { format: "multiple_choice", stem: "Mock exam stem one?", choices: ["A one", "B one", "C one", "D one"], correct: [1], steps: null, prompts: null, responses: null, matches: null, explanation: "Because.", exhibit: null },
      { format: "multiple_response", stem: "Mock exam stem two? Choose two.", choices: ["A two", "B two", "C two", "D two", "E two"], correct: [0, 2], steps: null, prompts: null, responses: null, matches: null, explanation: "Because.", exhibit: null },
    ] };
  return {};
}

export function mockClient() {
  return {
    messages: {
      async create(body: any) {
        const text = "Good question. Here's a nudge rather than the answer: think about what the idea is for. What's your best guess, and why?";
        return { content: [{ type: "text", text }], stop_reason: "end_turn", usage: usageFor(body, text) };
      },
      async parse(body: any) {
        const canned = cannedFor(body);
        const json = JSON.stringify(canned);
        const parsed = body.output_config.format.parse(json);
        return { parsed_output: parsed, stop_reason: "end_turn", usage: usageFor(body, json) };
      },
    },
  };
}

export async function mockCountTokens(p: { system: unknown; messages: unknown }): Promise<{ input_tokens: number }> {
  return { input_tokens: estimateTokens(JSON.stringify(p.system) + JSON.stringify(p.messages)) };
}
