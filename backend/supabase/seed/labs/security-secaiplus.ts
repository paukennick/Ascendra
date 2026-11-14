import { GENERAL_SAFETY, part, type SeedLabSet, matchPart, selectPart, orderPart } from "./types";
import { source } from "../sources";

// REQ-159: CompTIA SecAI+ CY0-001 (V1) -- verifiable labs beside the
// course's existing self-reported labs. SecAI+ is CompTIA's AI-security
// certification (launched 2026-02-17); confirmed current against CompTIA's
// own exam objectives PDF (Document Version 4.0).
//   https://www.comptia.org/en-us/certifications/secai/
//   Objectives PDF (CY0-001 V1): CompTIA SecAI+ Certification Exam Objectives
//
// Aligned to the CY0-001 objectives, four domains: Basic AI Concepts
// Related to Cybersecurity 17%; Securing AI Systems 40%; AI-assisted
// Security 24%; AI Governance, Risk, and Compliance 19%. Test details read
// 2026-11-07 (max 60 questions, 60 minutes, pass 600 on 100-900).
// Density (docs/labs.md, policy "hybrid"): 1 / 3 / 2 / 1 = 7, weighted to
// the 40% Securing-AI-Systems domain.
//
// References cited (each checked against the publisher 2026-11-07):
//   - OWASP Top 10 for LLM Applications 2025 (LLM01 Prompt Injection, LLM02
//     Sensitive Information Disclosure, LLM03 Supply Chain, LLM04 Data and
//     Model Poisoning, LLM05 Improper Output Handling, LLM06 Excessive
//     Agency, LLM07 System Prompt Leakage, LLM08 Vector and Embedding
//     Weaknesses, LLM09 Misinformation, LLM10 Unbounded Consumption).
//     https://genai.owasp.org/llm-top10/
//   - MITRE ATLAS (AML.T0051 LLM Prompt Injection with direct/indirect
//     sub-techniques, AML.T0054 LLM Jailbreak, AML.T0020 Poison Training
//     Data, AML.T0057 LLM Data Leakage). https://atlas.mitre.org/
//   - NIST AI Risk Management Framework AI 100-1 (January 2023): four core
//     functions Govern, Map, Measure, Manage. https://www.nist.gov/itl/ai-risk-management-framework
//   - EU AI Act risk tiers (unacceptable / high / limited / minimal).
//
// Fictional organisations and AI systems throughout; no real prompts,
// weights or data. Every lab is needs_expert_review.

export const SECAIPLUS_LABS: SeedLabSet = {
  trackCode: "SECAIPLUS",
  sources: [
    source("https://www.comptia.org/en-us/certifications/secai/", "exam_outline", "2026-11-07"),
    source("https://genai.owasp.org/llm-top10/", "reference", "2026-11-07"),
    source("https://atlas.mitre.org/", "reference", "2026-11-07"),
    source("https://www.nist.gov/itl/ai-risk-management-framework", "reference", "2026-11-07"),
    source("https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai", "reference", "2026-11-07"),
  ],
  labs: [
    // ----- Domain 1: Basic AI Concepts Related to Cybersecurity (1)
    {
      slug: "classify-ai-systems",
      objective:
        "AI types and techniques used in cybersecurity: generative AI, machine learning, deep learning, NLP (LLMs, SLMs, GANs), model training techniques, and prompt engineering (system/user prompts, zero/one/multi-shot)",
      kind: "build",
      title: "Classify the AI technique behind four security tools",
      brief:
        "Securing AI starts with naming what you are dealing with. A SOC at Vantage Grid (fictional) uses four AI-driven capabilities. (1) A spam filter trained on millions of labeled good/spam emails that outputs a spam probability. (2) A chat assistant that writes incident summaries from analyst notes. (3) A system that flags logins that deviate from a user's learned normal behavior, trained only on unlabeled activity. (4) A retrieval-augmented assistant that answers policy questions by pulling from the company wiki. For each, name the AI type/technique and one security consideration.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each capability and give a security consideration for each.",
          parts: [
            matchPart("Technique for each capability", "(1) supervised machine learning; (2) generative AI, a large language model; (3) unsupervised learning / anomaly detection; (4) an LLM with retrieval-augmented generation. Reinforcement learning fits none. All four right is met; two or three is partly there.", "(1) Spam filter -> supervised learning (labeled good/spam examples, a classifier). (2) Incident summarizer -> generative AI, an LLM. (3) Login anomaly system -> unsupervised learning / anomaly detection (no labels). (4) Policy assistant -> an LLM with retrieval-augmented generation (RAG) over the wiki. None of them learns from rewards, so reinforcement learning is not one of them.", { leftHeading: "Capability", rightHeading: "AI type", left: ["(1) Spam filter trained on labeled good/spam email", "(2) Chat assistant that writes incident summaries", "(3) Flags logins that deviate from learned normal, no labels", "(4) Answers policy questions by pulling from the wiki"], right: ["Supervised machine learning", "Generative AI (a large language model)", "Unsupervised learning / anomaly detection", "LLM with retrieval-augmented generation", "Reinforcement learning"], pairs: [0, 1, 2, 3] }),
            part(
              "Supervised vs. unsupervised learning",
              "Identifies (1) the spam filter as supervised machine learning (labeled training data, classification) and (3) the behavior-anomaly system as unsupervised/anomaly detection (no labels), distinguishing the two.",
              "(1) Spam filter: supervised machine learning -- trained on labeled good/spam examples to classify new mail; consideration: label/training-data poisoning could skew it. (3) Login anomaly system: unsupervised learning / anomaly detection -- learns normal from unlabeled activity with no 'attack' labels; consideration: it flags deviations, so it is prone to false positives and to 'normal drift' being learned as acceptable."
            ),
            part(
              "Generative AI and LLMs",
              "Identifies (2) the summarizer as generative AI / an LLM and names a consideration (hallucination, sensitive-data exposure in prompts).",
              "(2) Incident summarizer: generative AI, a large language model. Consideration: it can hallucinate details not in the notes, and analyst notes pasted into it may expose sensitive data, so outputs need checking and inputs need care."
            ),
            part(
              "Retrieval-augmented generation",
              "Identifies (4) as an LLM using retrieval-augmented generation (RAG, grounding answers in retrieved documents) and names a consideration (the retrieved content is attack surface; indirect prompt injection; access control on the corpus).",
              "(4) Policy assistant: an LLM with retrieval-augmented generation (RAG) -- it grounds answers in documents fetched from the wiki (via embeddings/vector search). Consideration: the retrieved content is untrusted input, so a poisoned or injected wiki page can mislead or hijack it, and the corpus needs access control so it does not surface data the asker should not see."
            ),
            part(
              "Why classification matters for security",
              "Explains that the AI type determines its threats and controls -- a supervised classifier's risk (poisoning) differs from an LLM's (prompt injection, data leakage) -- so naming it correctly drives the right defense.",
              "Naming the technique drives the defense: a supervised classifier's main risk is training-data poisoning; an LLM's are prompt injection, hallucination and sensitive-data leakage; a RAG system adds its retrieval corpus as attack surface. You cannot secure an AI system without first knowing what kind it is."
            ),
          ],
        },
      ],
    },
    // ----- Domain 2: Securing AI Systems (3)
    {
      slug: "threat-model-llm-app",
      objective: "AI threat-modeling frameworks: the OWASP LLM and ML Security Top 10, the MIT AI Risk Repository, and MITRE ATLAS",
      kind: "build",
      title: "Threat-model an LLM customer-support app",
      brief:
        "Lumen Retail (fictional) is building a customer-support assistant: a public-facing LLM that answers questions, retrieves order data for the signed-in customer, and can issue refunds up to a limit by calling an internal tool. You must threat-model it using the OWASP Top 10 for LLM Applications and MITRE ATLAS, naming concrete risks and controls.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Identify the top risks with framework references and a control for each.",
          parts: [
            part(
              "Prompt injection",
              "Names prompt injection (OWASP LLM01, MITRE ATLAS AML.T0051) including indirect injection via retrieved order data, with a control (input/output guardrails, treat retrieved content as data, confirm tool actions).",
              "Prompt injection -- OWASP LLM01:2025, MITRE ATLAS AML.T0051 -- including indirect injection through retrieved order text. Control: treat all retrieved/user content as untrusted data not instructions, add guardrails that detect instruction-like input, and require confirmation/limits before the refund tool acts."
            ),
            part(
              "Excessive agency on the refund tool",
              "Names excessive agency (OWASP LLM06): the refund capability can be abused via injection, with a control (hard server-side limits, authorization, human approval above a threshold, not relying on the model to self-limit).",
              "Excessive Agency -- OWASP LLM06:2025 -- the assistant can move money, so an injection or jailbreak could trigger fraudulent refunds. Control: enforce the refund limit and authorization server-side (never trust the model to respect the cap), scope the tool tightly, and require human approval above a low threshold."
            ),
            part(
              "Sensitive data and output handling",
              "Names sensitive-information disclosure and improper output handling (OWASP LLM02/LLM05, ATLAS data leakage): the model must not reveal another customer's order data or leak its system prompt, with access-control and output controls.",
              "Sensitive Information Disclosure (LLM02) and Improper Output Handling (LLM05), with ATLAS LLM Data Leakage (AML.T0057): the assistant must retrieve only the signed-in customer's data and must not leak other customers' orders or its system prompt. Control: enforce per-user authorization on retrieval server-side and screen outputs; do not rely on prompt instructions alone."
            ),
            part(
              "Using the frameworks",
              "Explains the value of mapping to OWASP LLM Top 10 / ATLAS: shared vocabulary, coverage check against known AI risks, and a basis for testing -- not an ad hoc list.",
              "Mapping to OWASP LLM Top 10 and MITRE ATLAS gives a shared vocabulary, a checklist so no known AI-specific risk class is missed (poisoning, supply chain, unbounded consumption, etc.), and a basis for red-team testing. It turns 'what could go wrong with the AI' from guesswork into coverage."
            ),
          ],
        },
      ],
    },
    {
      slug: "ai-security-controls-deployment",
      objective:
        "Security controls for AI systems: model controls and guardrails, gateway controls (prompt firewalls, rate/token limits, input quotas), and guardrail testing and validation",
      kind: "build",
      title: "Specify the controls for an enterprise AI deployment",
      brief:
        "Ashford Insurance (fictional) is deploying an internal LLM assistant accessed by 2,000 staff through a central gateway. Risks of concern: prompt injection and jailbreaks, runaway cost from unbounded use, sensitive data in prompts, and unsafe outputs. You must specify the model-level and gateway-level controls and how they are validated.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify the control layers and how you validate them.",
          parts: [
            part(
              "Gateway controls",
              "Specifies gateway-level controls: a prompt firewall/filter, rate limits and token/request quotas per user, and input size limits -- addressing injection attempts and unbounded consumption (OWASP LLM10).",
              "At the gateway: a prompt firewall that inspects and filters inputs/outputs, per-user rate limits and token quotas, and input-size limits. These contain injection/jailbreak attempts and prevent runaway cost or denial-of-service from unbounded consumption (OWASP LLM10)."
            ),
            part(
              "Model-level guardrails",
              "Specifies model guardrails: system-prompt hardening, output filtering/moderation, refusal of out-of-scope requests, and grounding -- while noting guardrails are defense-in-depth, not a single barrier.",
              "At the model: guardrails that constrain behavior (hardened system instructions, output moderation/filters, refusal of out-of-scope or unsafe requests) and grounding to approved sources. Treat these as one layer -- guardrails can be bypassed, so they sit behind gateway controls and server-side enforcement, not instead of them."
            ),
            part(
              "Data protection in prompts",
              "Adds controls for sensitive data in prompts: redaction/DLP on inputs, not logging sensitive prompts in clear, and classification of what may be sent to the model.",
              "Protect data in prompts: apply DLP/redaction to inputs so staff cannot paste regulated data into the model, avoid logging prompts/outputs with sensitive content in clear, and define what data classification may be sent at all. The prompt channel is a data-exfiltration path if unmanaged."
            ),
            part(
              "Guardrail testing and validation",
              "Specifies validating the guardrails: red-team/adversarial testing (injection, jailbreak attempts), regression testing of filters, and monitoring in production -- so controls are proven, not assumed.",
              "Validate the guardrails: run adversarial/red-team tests with known injection and jailbreak techniques against the deployment, regression-test the filters as prompts and models change, and monitor production for bypasses and anomalies. A guardrail you have not tried to break is an assumption."
            ),
          ],
        },
      ],
    },
    {
      slug: "analyze-ai-attack-evidence",
      objective:
        "Analyzing evidence of AI-specific attacks and applying compensating controls: prompt injection, model/data poisoning, jailbreaking, model inversion and theft, and AI supply-chain attacks",
      kind: "case",
      title: "Investigate anomalies in a deployed AI system",
      brief:
        "You secure AI systems at Beacon Analytics (fictional). Over two weeks three separate anomalies are reported in a deployed fraud-detection model and its companion LLM assistant. You investigate each and recommend compensating controls, using OWASP LLM Top 10 and MITRE ATLAS as references. No real model internals or data are reproduced.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "First anomaly: the LLM assistant, when given a certain phrasing by an external user, began ignoring its restrictions and produced internal-only information it normally refuses.",
          ask: "Name the attack and a compensating control.",
          parts: [
            part(
              "Jailbreak / prompt injection",
              "Identifies a jailbreak / prompt injection (OWASP LLM01, MITRE ATLAS AML.T0054/AML.T0051) bypassing the model's restrictions, with a compensating control (input/output guardrails, server-side enforcement of what it can reveal).",
              "A jailbreak (MITRE ATLAS AML.T0054) via prompt injection (OWASP LLM01 / AML.T0051): crafted input got the model to ignore its guardrails. Compensating control: enforce access to internal information server-side (the model should not be able to retrieve it for an external user at all), plus stronger input/output guardrails and monitoring for bypass patterns."
            ),
          ],
        },
        {
          text: "Second anomaly: over several weeks the fraud model's accuracy on a specific category of transactions quietly degraded, and retraining data was found to include a batch of mislabeled examples from an external feed.",
          ask: "Name the attack and a compensating control.",
          parts: [
            part(
              "Data poisoning",
              "Identifies data/model poisoning (OWASP LLM04, MITRE ATLAS AML.T0020 Poison Training Data) via the external feed, with a control (validate/curate training data, provenance checks, monitor model performance for drift).",
              "Data poisoning (MITRE ATLAS AML.T0020 Poison Training Data; OWASP LLM04 Data and Model Poisoning): mislabeled examples from an external feed corrupted retraining, degrading accuracy on the targeted category. Compensating control: validate and curate training data with provenance/integrity checks before ingestion, vet external feeds, and monitor model performance so drift triggers investigation."
            ),
          ],
        },
        {
          text: "Third anomaly: an external party made a very large number of systematic queries to the model's public scoring API, apparently to reconstruct how it makes decisions.",
          ask: "Name the attack and a compensating control.",
          parts: [
            part(
              "Model theft / inversion via the API",
              "Identifies model extraction/theft or inversion through API abuse, with a control (rate limiting/quotas, monitoring for systematic querying, authentication, limiting output detail).",
              "Model extraction/theft (and the related model-inversion risk): systematic high-volume querying to reconstruct the model or its training data through the public API. Compensating control: authenticate and rate-limit the API, monitor for the systematic query patterns that signal extraction, and limit the detail returned (e.g. coarse scores, not full confidence internals) so each query leaks less."
            ),
          ],
        },
      ],
    },
    // ----- Domain 3: AI-assisted Security (2)
    {
      slug: "ai-assisted-soc-with-verification",
      objective:
        "Using AI-enabled tools to facilitate security tasks: IDE/browser/CLI plug-ins, chatbots, MCP servers, and use cases like vulnerability analysis and automated penetration testing",
      kind: "build",
      title: "Use AI tools in the SOC without being misled",
      brief:
        "A SOC at Crestwood Mutual (fictional) wants to adopt AI assistants: a chatbot to summarize alerts, an IDE/CLI plug-in to help write detection rules, and a tool that drafts vulnerability analyses. The SOC lead worries about hallucinations, data exposure and over-reliance. You must recommend how to use these tools effectively and safely.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend how to use AI-assisted tooling with the right safeguards.",
          parts: [
            part(
              "Good use cases",
              "Identifies where AI assists well: summarising/triaging alerts, drafting detection rules and queries, enriching and explaining findings -- as a force-multiplier for analyst time.",
              "Use AI where it accelerates analysts: summarizing and triaging high-volume alerts, drafting detection rules/queries and regex, and explaining or enriching findings. These are force-multipliers that cut toil and speed investigation."
            ),
            part(
              "Verify outputs (hallucination)",
              "Requires verification of AI output against ground truth -- every claim checked against the raw logs/data, generated rules tested -- because the model can hallucinate confidently.",
              "Verify everything: check an AI summary's claims against the raw logs, and test any generated detection rule before deploying it. The model can state false details confidently, so AI output is a draft for an analyst to confirm, never an authority to act on blindly."
            ),
            part(
              "Protect data",
              "Addresses data exposure: do not paste sensitive logs/customer data or secrets into external AI tools, use approved/enterprise instances, and apply data-handling policy.",
              "Protect data: do not paste sensitive logs, customer data or credentials into external/consumer AI tools; use approved enterprise instances with contractual data protections, and follow a data-handling policy for what may be sent. The convenience is not worth leaking the data you are defending."
            ),
            part(
              "Guard against over-reliance",
              "Warns against over-reliance/automation bias: keep analyst judgment and skills, keep a human in the loop for decisions, and treat AI as assisting not replacing the analyst.",
              "Guard against over-reliance: keep a human in the loop for decisions, maintain analysts' own skills so they can catch AI errors, and do not let 'the AI said so' replace judgment. The analyst remains accountable; the AI assists."
            ),
          ],
        },
      ],
    },
    {
      slug: "defend-ai-enhanced-attacks",
      objective:
        "How AI enables or enhances attack vectors: deepfake impersonation and disinformation, adversarial networks, automated reconnaissance, and automated attack generation",
      kind: "case",
      title: "Defend against an AI-enhanced social-engineering attack",
      brief:
        "Granite Trust (fictional), a finance firm, is targeted by attackers using AI to enhance their methods. You must recognize the AI-enabled elements and recommend defenses. No instructions for conducting any attack are needed -- this is a defender's analysis.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Finance staff receive highly convincing, personalized phishing emails at scale, each referencing real projects and written in flawless company style -- far more tailored than past campaigns.",
          ask: "What AI capability enabled this, and how do you defend?",
          parts: [
            part(
              "Automated, AI-generated phishing",
              "Identifies generative AI enabling scaled, personalized, well-written phishing (automated attack generation + automated reconnaissance) and recommends defenses not reliant on spotting bad grammar: MFA, email authentication, reporting culture, and link/attachment controls.",
              "Generative AI enables mass-produced, highly personalized phishing (automated reconnaissance to gather the project references, automated generation for flawless tailored text). Defense cannot rely on 'spot the typo' anymore: enforce phishing-resistant MFA, email authentication (SPF/DKIM/DMARC), strong reporting culture and link/attachment protections, so a convincing email still fails to achieve account takeover."
            ),
          ],
        },
        {
          text: "Days later, the finance director receives a video call that looks and sounds like the CEO, urgently authorizing a large wire transfer to a new account.",
          ask: "Name the technique and the controls that stop the fraud.",
          parts: [
            part(
              "Deepfake impersonation",
              "Identifies deepfake audio/video impersonation and recommends process controls that do not depend on recognizing the fake: out-of-band verification, multi-person authorization, call-back on known numbers, and payment controls.",
              "This is deepfake impersonation -- AI-generated video/voice of the CEO. The defense is process, not fake-spotting: require out-of-band verification of any payment or banking-detail change through a known channel, multi-person authorization for large/urgent transfers, call-back on a pre-established number, and a policy that urgency never bypasses controls. A convincing deepfake then still cannot move money alone."
            ),
            part(
              "Awareness and verification culture",
              "Recommends training staff that voice/video can be faked and that verification procedures apply regardless of how authentic a request seems, so social pressure does not override controls.",
              "Train staff that realistic voice and video can be fabricated, so the verification procedure applies no matter how genuine and senior the request seems. The attack relies on authority and urgency overriding process; a culture where anyone can insist on out-of-band verification defeats it."
            ),
          ],
        },
      ],
    },
    // ----- Domain 4: AI Governance, Risk, and Compliance (1)
    {
      slug: "ai-governance-rmf-compliance",
      objective:
        "The impact of compliance on AI business use and development: the EU AI Act, OECD standards, ISO AI standards, the NIST AI Risk Management Framework, and data sovereignty",
      kind: "build",
      title: "Govern a new AI initiative for risk and compliance",
      brief:
        "Meridian Bank (fictional) plans an AI system that helps decide loan applications, used for customers in the EU and the US. Leadership wants it shipped fast. You must set the governance, risk and compliance approach, referencing the NIST AI Risk Management Framework and the EU AI Act, before it is built.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Set the AI governance and compliance approach.",
          parts: [
            part(
              "NIST AI RMF functions",
              "Structures governance around the NIST AI RMF four functions -- Govern, Map, Measure, Manage -- applying them to this system (governance structure, mapping context/risks, measuring bias/performance, managing risk over time).",
              "Use the NIST AI RMF's four functions: Govern (set AI policy, roles and oversight), Map (understand the context and risks of an AI loan-decision system), Measure (test for bias, accuracy and robustness), and Manage (treat and monitor the risks over the system's life). It turns 'ship it fast' into a structured, defensible process."
            ),
            part(
              "EU AI Act risk tier",
              "Identifies that AI used for creditworthiness/loan decisions is likely high-risk under the EU AI Act, triggering obligations (risk management, data governance, transparency, human oversight) before deployment in the EU.",
              "Under the EU AI Act, AI used to evaluate creditworthiness is generally high-risk, which brings obligations: a risk-management system, data governance, documentation and transparency, human oversight, and accuracy/robustness requirements -- met before the system is placed on the EU market. 'Ship fast' cannot skip these for EU customers."
            ),
            part(
              "Fairness, explainability, human oversight",
              "Requires bias/fairness testing, explainability of decisions (adverse-action reasons), and human oversight of automated decisions -- responsible-AI principles and often legal requirements for lending.",
              "Because the system makes consequential decisions about people: test for and mitigate bias across protected groups, make decisions explainable (applicants are typically owed reasons for denial), and keep meaningful human oversight rather than fully automated rejection. These are both responsible-AI principles and, for lending, often legal requirements."
            ),
            part(
              "Data sovereignty",
              "Addresses data sovereignty / cross-border data: EU applicant data handling and residency obligations, and keeping training/inference data within the right jurisdiction or using valid transfer mechanisms.",
              "Handle data sovereignty: EU applicants' personal data carries residency and transfer obligations, so keep it in-region or use a valid transfer mechanism, and be clear where training and inference data live. Governance must cover where the data is, not just how the model works."
            ),
          ],
        },
      ],
    },
    // REQ-295 (2026-11-14): density fill to 2 / 3 / 3 / 2. Concepts and
    // classifications from the SecAI+ objectives the set cites; no outside
    // value is quoted.
    {
      slug: "rag-pipeline-data-exposure",
      objective:
        "The importance of data security in relation to AI: data processing and lineage, data types, watermarking, and retrieval-augmented generation (vector storage, embeddings)",
      kind: "build",
      title: "Find the data exposures in a RAG assistant's design",
      brief:
        "Ostrander Legal (fictional) is piloting an internal assistant that answers staff questions with retrieval-augmented generation (RAG). The design note lists how it works:\n\n1. Every file on the shared drive is split into chunks and embedded nightly.\n2. Embeddings and the chunk text go into one vector index shared by all staff.\n3. At query time the top 8 chunks by similarity are added to the prompt.\n4. The vector database is reachable only from the app's private subnet.\n5. Retrieval does not check the asking user's permissions on the source file.\n6. Prompts and answers are logged in full, including retrieved chunks, kept indefinitely.\n7. Each chunk keeps a link to its source file and the date it was indexed.\n\nThe shared drive includes HR investigation files and client matters behind ethical walls.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "The design and its data are the fictional firm's, given in the brief; the lab applies data-security concepts and quotes no outside value.",
      steps: [
        {
          text: "",
          ask: "Tap the design lines that expose data, match each control to the risk it reduces, and write the corrected design.",
          parts: [
            selectPart(
              "Design lines that expose data",
              "Met: exactly lines 1 (indexing everything, including HR and walled matters), 2 (one shared index), 5 (no permission check at retrieval) and 6 (full logs kept forever). (Right picks minus wrong picks) of at least two is partly there.",
              "Indexing every file pulls HR investigations and walled client matters into the assistant; putting them in one shared index and skipping the permission check means any staff member's question can retrieve them -- the model will happily quote whatever retrieval hands it. Logging full prompts with retrieved chunks forever creates a second copy of that data with no retention limit. A private-subnet database and source links with index dates (lineage) are good practice.",
              {
                display: "list",
                lines: ["1. Every file on the shared drive is chunked and embedded nightly", "2. Embeddings and chunk text go into one index shared by all staff", "3. The top 8 chunks by similarity are added to the prompt", "4. The vector database is reachable only from the app's private subnet", "5. Retrieval does not check the user's permission on the source file", "6. Prompts, answers and retrieved chunks are logged in full, kept indefinitely", "7. Each chunk keeps a link to its source file and its index date"],
                correct: [0, 1, 4, 5],
              }
            ),
            matchPart(
              "Control for each risk",
              "Met: all four right -- staff seeing files they could not open: permission-aware retrieval filtered by the user's access; HR and walled matters in the index at all: classify and exclude them before indexing (data minimization); logs becoming a second copy of sensitive text: redact and set a retention limit; not knowing which document an answer came from: lineage metadata and citations. Three right is partly there.",
              "Permission checks at retrieval enforce the source system's access on every query. Classification and minimization keep data that should never be retrievable out of the index. Redaction and retention keep logs from becoming a shadow archive. Lineage (source and date per chunk) lets answers cite their source and lets a removed file be purged from the index.",
              {
                leftHeading: "Risk",
                rightHeading: "Control",
                left: ["Staff retrieve text from files they cannot open", "HR and walled client matters are in the index at all", "Logs become a permanent copy of sensitive text", "No one can tell which document an answer came from"],
                right: ["Permission-aware retrieval filtered by the user's access", "Classify and exclude before indexing (data minimization)", "Redact logs and set a retention limit", "Lineage metadata and citations per chunk", "A larger embedding model"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Corrected design",
              "Indexes only approved, classified sources and excludes HR and walled matters (or gives them separate, access-controlled indexes); stores each chunk with its source ACL and lineage and filters retrieval by the asking user's current permissions (re-synced when access changes, and purged when a file is deleted); encrypts the index at rest and keeps it on the private subnet; logs with redaction and a defined retention, access-controlled; tests the result by querying as users who should NOT see restricted files.",
              "1. Index only approved repositories; classify first and exclude HR investigations and walled matters, or put them in separate indexes only their teams can query.\n2. Store with every chunk its source link, index date and the source file's access list; at query time retrieve only chunks the asking user can open now, re-syncing permissions nightly and deleting chunks when a file is removed.\n3. Keep the vector database on the private subnet and encrypt it at rest; embeddings can leak their source text, so treat them as sensitive as the text.\n4. Log metadata by default; where full prompts are kept, redact them and set a retention period, with access limited to the owning team.\n5. Prove it: before launch, ask questions as a paralegal outside the wall and as a non-HR employee and confirm nothing restricted comes back."
            ),
          ],
        },
      ],
    },
    {
      slug: "ai-agent-in-cicd-guardrails",
      objective: "Using AI to automate security tasks: low-code/no-code scripting, AI-assisted change management, AI agents, and CI/CD security scanning",
      kind: "build",
      title: "Put an AI fixing agent into the pipeline without giving it the keys",
      brief:
        "Halyard Payments (fictional) wants an AI agent that reads security-scan findings in its CI/CD pipeline, writes fix pull requests and 'merges the low-risk ones automatically'. Today the pipeline is: commit, build, deploy to production, and a weekly scan of production. The agent would run with the same token the deploy job uses, which can push to main and deploy.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Pipeline stages and roles are the fictional company's, given in the brief; the lab applies secure-pipeline concepts and quotes no outside value.",
      steps: [
        {
          text: "",
          ask: "Order the pipeline with its security checks, then write the guardrails for the agent.",
          parts: [
            orderPart(
              "Pipeline with security checks",
              "Met: exactly -- commit with secret scanning; static analysis and dependency scan on the pull request; human review and approval of the pull request; build and sign the artifact; deploy to staging and run a dynamic scan; promote to production. One item out of place is partly there.",
              "Cheap, early checks run first: secrets are caught at commit, code and dependency flaws on the pull request, before any human spends review time. Approval comes before the build that will ship. A signed artifact proves what was built is what gets deployed. Dynamic scanning needs a running app, so it happens in staging, and only then does the same artifact go to production -- instead of finding problems in production once a week.",
              ["Commit, with secret scanning", "Static analysis and dependency scan on the pull request", "Human review and approval of the pull request", "Build and sign the artifact", "Deploy to staging and run a dynamic scan", "Promote the same artifact to production"]
            ),
            part(
              "Guardrails for the agent",
              "Gives the agent its own least-privilege identity (can open branches and pull requests, cannot push to main, merge, deploy or read production secrets); every agent pull request goes through the same scans and a required human approval (branch protection), so 'auto-merge low-risk' is dropped or limited to a narrow, pre-approved class with tests passing; agent actions logged and attributable; inputs (scan findings, code comments) treated as untrusted because they can carry prompt injection; a kill switch and rate limits; outcomes reviewed. Explains why the deploy token is wrong (one prompt injection or bad fix ships straight to production).",
              "1. Its own identity with least privilege: create branches and open pull requests; no push to main, no merge, no deploy, no production secrets. Never the deploy token -- with it, one bad fix or one prompt-injected instruction hidden in a code comment or finding goes straight to production.\n2. Branch protection applies to it like anyone else: all scans pass and a named human approves before merge. Drop 'auto-merge low-risk'; if the team insists, limit it to a narrow pre-approved class (for example a patch-level dependency bump with tests green), still behind the same checks.\n3. Treat everything it reads -- findings, issue text, code comments -- as untrusted input, and keep its tools to the repository it works on.\n4. Log every action under the agent's identity, cap how many pull requests it opens per day, and keep a switch that disables it at once.\n5. Review a sample of its fixes each sprint: an AI fix that silences a scanner is not a fix."
            ),
          ],
        },
      ],
    },
    {
      slug: "responsible-ai-risk-register",
      objective:
        "Principles and risks of responsible AI use: transparency, explainability, accountability, and risks such as bias introduction, accidental data leakage, IP exposure, and shadow AI",
      kind: "build",
      title: "Name the responsible-AI risk in four incidents and set the policy",
      brief:
        "The new AI governance lead at Copperline Retail (fictional) has four incident reports from one month:\n\nA. A store manager pasted a spreadsheet of customer names and loyalty numbers into a free public chatbot to 'tidy the columns'.\nB. Marketing used an image generator for a campaign; a stock agency says one image closely copies a photo it licenses.\nC. A resume-screening model trained on ten years of past hires ranks applicants from two community colleges consistently lower.\nD. A loan-style store-credit tool declines applicants, and staff can't say why when customers ask.\n\nShe also learns that 40 staff use AI browser extensions the company never approved.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "The incidents are the fictional company's, given in the brief; the lab classifies risks and quotes no outside value.",
      steps: [
        {
          text: "",
          ask: "Match each incident to its main risk, then write the policy points that address them.",
          parts: [
            matchPart(
              "Main risk in each incident",
              "Met: all five right -- A: accidental data leakage; B: intellectual property exposure; C: bias introduced through training data; D: lack of explainability and accountability; the unapproved extensions: shadow AI. Three or four right is partly there.",
              "A sent customer personal data to a service outside the company's control (leakage). B risks infringing someone else's copyright (IP exposure). C learned the pattern in past hiring decisions and repeats it (bias from data). D makes decisions no one can explain or answer for (explainability and accountability). The extensions are AI tools in use outside governance (shadow AI), which is how A happened.",
              {
                leftHeading: "Incident",
                rightHeading: "Main risk",
                left: ["A: customer data pasted into a public chatbot", "B: generated image copies a licensed photo", "C: screening model ranks two colleges lower", "D: credit tool declines and no one can say why", "40 staff using unapproved AI browser extensions"],
                right: ["Accidental data leakage", "Intellectual property exposure", "Bias introduced through training data", "Lack of explainability and accountability", "Shadow AI", "Model theft"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Policy points",
              "An acceptable-use policy with an approved-tools list and a simple request path (to pull shadow AI into the open rather than only banning it); data rules (no personal, customer or confidential data in unapproved tools; enterprise tools with no-training terms; DLP where possible); IP review of generated content before publishing and vendor indemnity terms; bias testing before and during use of models that affect people, with a human reviewer; explainability and a named accountable owner for any automated decision, with a way for customers to get a reason and a human review; transparency to customers when AI is used; training and an inventory of AI use.",
              "1. Approved tools and a fast request path: publish what staff may use, and make it easy to ask for more -- banning alone drives shadow AI underground. Inventory and remove the 40 extensions.\n2. Data rules: no customer, employee or confidential data in any tool not on the list; approved tools under contract terms that exclude training on our data; DLP on the browser where possible.\n3. IP: generated marketing content gets a provenance and similarity check before use, and vendor terms covering indemnity.\n4. Fairness: any model that affects people (hiring, credit) is tested for disparate outcomes before launch and on a schedule, with a human making the final call.\n5. Explainability and accountability: every automated decision has a named owner, records the main factors behind each outcome, and gives customers a reason and a route to human review; tell people when AI is part of the decision.\n6. Training for staff on all of the above, with incidents like A used as the example."
            ),
          ],
        },
      ],
    },
  ],
};
