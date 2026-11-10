import { GENERAL_SAFETY, part, type SeedLabSet, matchPart } from "./types";
import { source } from "../sources";

// REQ-158: Google Cloud Generative AI Leader.
//
// Aligned to the exam guide's four sections (Fundamentals 30%, Google
// Cloud's gen AI offerings 35%, Techniques to improve output 20%, Business
// strategies 15%). This is a business-level exam, so the labs ask for what a
// leader does: choose a foundation model against stated criteria, classify
// use cases, map a plan to lifecycle stages and tools, match needs to
// Google Cloud products, design an agent's tooling, fix a pilot's output
// problems, set sampling parameters, measure impact and sequence an
// adoption. No code, no infrastructure. Density ("hybrid"): 3 / 3 / 2 / 2.
//
// Product names follow the exam guide (Gemini Enterprise, Gemini for Google
// Workspace, Customer Engagement Suite, Agent Platform, Agent Search). The
// guide uses Google's current platform name, Gemini Enterprise Agent
// Platform, formerly Vertex AI. Sources (all read 2026-11-07):
//   exam guide  https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf
//   Context caching (prompt reuse)  https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview
//   Model Armor  https://cloud.google.com/security-command-center/docs/model-armor-overview
//   Sensitive Data Protection  https://cloud.google.com/sensitive-data-protection/docs/deidentify-sensitive-data
// Every lab is needs_expert_review until a person checks it.

export const GCPGAIL_LABS: SeedLabSet = {
  trackCode: "GCPGAIL",
  sources: [source("https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf", "exam_outline", "2026-11-07")],
  labs: [
    // ---------------- Section 1: Fundamentals (3) ----------------
    {
      slug: "choose-foundation-model-by-criteria",
      objective:
        "Choosing the appropriate foundation model for a business use case: modality, context window, security, availability/reliability, cost, performance, fine-tuning, customization",
      kind: "build",
      title: "Choose a foundation model for three business needs",
      brief:
        "You lead digital products at Greywell Insurance. Three teams want a generative AI model and each has written down what matters. Claims: 'We need to read a whole 300-page claim file including photos of damage and answer questions about it; accuracy matters more than speed; the data is confidential and must stay in our cloud tenancy.' Marketing: 'Thousands of short product descriptions a day, cheap and fast, tone must match our brand guide; we can give you 2,000 examples of approved copy.' Contact centre: 'Live voice assistance for agents in six languages, must respond in well under a second, and must be available during every shift with a vendor commitment.' Write a recommendation that applies the selection criteria to each team.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each team, name the criteria that decide the choice and the kind of model and deployment you recommend.",
          parts: [
            part(
              "Claims",
              "Prioritises multimodal capability (documents and images), a long context window large enough for the whole file, and security (enterprise platform with data kept in the company's tenancy, not a consumer app), accepting higher cost and latency for accuracy; recommends a larger multimodal Gemini-class model through the enterprise platform.",
              "Deciding criteria: modality (text plus images), context window (the full 300-page file in one prompt rather than fragments), security and privacy (an enterprise deployment on the Agent Platform where prompts are not used to train the vendor's models and data stays in Greywell's project), and performance over cost. Recommend a large multimodal Gemini model with a long context window on the Agent Platform; latency and price per call are acceptable because accuracy decides claims."
            ),
            part(
              "Marketing",
              "Prioritises cost and speed for high volume plus customisation: a smaller, faster model, with the 2,000 approved examples used for fine-tuning (or few-shot prompting / a style guide) to lock in brand tone.",
              "Deciding criteria: cost and latency at thousands of calls a day, and customisation for brand tone. Recommend a smaller, faster Gemini model (a Flash-class model) and use the 2,000 approved descriptions: start with few-shot examples and a brand style prompt, and if tone is still inconsistent, fine-tune the model on those examples so the style is baked in and prompts get shorter and cheaper."
            ),
            part(
              "Contact centre",
              "Prioritises latency (sub-second), availability and reliability (an enterprise SLA, provisioned capacity), multilingual and speech modality; recommends the Customer Engagement Suite's Agent Assist or a low-latency model with provisioned throughput rather than a consumer tool.",
              "Deciding criteria: performance in the sense of latency (well under a second for live assistance), availability and reliability (a vendor service-level commitment and reserved capacity for every shift), and modality (speech in six languages). Recommend Agent Assist from Google's Customer Engagement Suite, which is built for real-time agent support, or a low-latency Gemini model on the Agent Platform with Provisioned Throughput for guaranteed capacity; a consumer chat app has no such commitments."
            ),
            part(
              "What you did not choose and why",
              "Explains at least one rejected option per team or overall (for example one biggest model for everyone, which fails marketing on cost and the contact centre on latency; or consumer tools, which fail claims on confidentiality).",
              "Not one model for everyone: the largest model would fail marketing on cost and the contact centre on latency, and the smallest would fail claims on reasoning over a long multimodal file. Not consumer AI apps for claims or the contact centre: they do not offer the data-handling guarantees, tenancy controls or service commitments the teams need."
            ),
          ],
        },
      ],
    },
    {
      slug: "classify-gen-ai-use-cases",
      objective:
        "Identifying business use cases where gen AI creates, summarizes, discovers, or automates: text, image, code, and video generation, data analysis, personalized experience",
      kind: "build",
      title: "Sort five requests into gen AI use-case types",
      brief:
        "As the AI lead at Fairholme Logistics you receive five requests in one week. (A) Operations: 'Turn each 40-page incident report into a one-page brief for the board.' (B) Sales: 'Let customers ask our 10,000-page tariff and route documentation questions in plain language and get the right passage.' (C) Marketing: 'Produce product images of our new electric vans in different cities for regional campaigns.' (D) Finance: 'Read incoming supplier invoices, extract the fields and raise the payment request without a person typing it.' (E) IT: 'Calculate our exact fuel spend per route last quarter.' Classify each by what gen AI would do, name the modality, and flag any request where gen AI is the wrong tool.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each request as create, summarize, discover or automate, name the modality, and say whether gen AI is the right tool.",
          parts: [
            matchPart("Use-case type for each request", "A summarize, B discover, C create, D automate, E not a gen AI task (an exact calculation over structured data). All five right is met; three or four is partly there.", "A summarize (text). B discover (grounded search and answers over documents). C create (image generation). D automate (document understanding that triggers a workflow). E is an exact number from structured data: a query, not gen AI, which could at most help write the query.", {"leftHeading": "Request", "rightHeading": "Use-case type", "left": ["A: 40-page incident reports to one-page briefs", "B: plain-language questions over 10,000 pages of tariffs", "C: images of the new vans in different cities", "D: read invoices, extract fields, raise the payment", "E: exact fuel spend per route last quarter"], "right": ["Summarize", "Discover", "Create", "Automate", "Not a gen AI task: a database or analytics query"], "pairs": [0, 1, 2, 3, 4]}),
            part("Modality and fit", "Names the modality for each and whether gen AI is the right tool: A: incident briefs: Classifies as summarize (text), a strong fit, with a note that facts should be checked or grounded in the source report. B: documentation questions: Classifies as discover (search and retrieval over enterprise documents with natural-language answers), a strong fit for a grounded search or RAG offering. C: van images: Classifies as create (image generation), a fit, with brand and rights review. D: invoice processing: Classifies as automate (document understanding plus triggering a workflow), a fit, and notes extraction is often better served by a document AI capability with a human check on exceptions. E: exact fuel spend: Flags that an exact calculation over structured data is a database/analytics query, not a gen AI task; gen AI could at most help write the query (code generation) but must not be trusted to compute the number.", "A: incident briefs: Summarize, text generation: condensing long reports into board briefs is a core gen AI strength. Fit: yes, with the model grounded on the report itself and a human owner checking numbers before the board sees them. B: documentation questions: Discover: natural-language search across 10,000 pages, returning the right passage with an answer, is what grounded enterprise search (for example Agent Search with retrieval-augmented generation) does. Fit: yes, as long as answers cite the passage they came from. C: van images: Create, image generation: generating campaign images of the vans in different city settings is a fit for an image model such as Imagen, with brand guidelines and legal review of generated scenes before publication. D: invoice processing: Automate: reading invoices, extracting fields and triggering the payment request is process automation driven by document understanding (Document AI or a multimodal model) with an action at the end. Fit: yes, with human review for low-confidence extractions and amounts above a threshold. E: exact fuel spend: Not a gen AI use case: an exact figure from structured transaction data is a SQL or BI question against the data warehouse. A model that 'estimates' it would be wrong and unauditable. Gen AI can help here only by generating the query (code generation) or explaining the result, with the warehouse doing the arithmetic."),
          ],
        },
      ],
    },
    {
      slug: "map-plan-to-ml-lifecycle",
      objective:
        "Identifying the stages of the ML lifecycle -- data ingestion, data preparation, model training, model deployment, model management -- and the Google Cloud tool for each",
      kind: "build",
      title: "Map a project plan onto the ML lifecycle and Google Cloud tools",
      brief:
        "A vendor has sent Hollins Retail, where you are head of analytics, a project plan for a demand-forecasting model. Its tasks, out of order, are: 'serve forecasts to the store-ordering system through an API'; 'copy three years of sales and weather data from our point-of-sale system and a weather feed into the cloud'; 'remove duplicate transactions, fill missing days and build features such as rolling averages'; 'retrain weekly and track which version is live, with alerts if accuracy drops'; 'fit and tune the forecasting model'. The board asks you to explain the plan in lifecycle terms and name the Google Cloud tool you would expect at each stage, so they can judge whether anything is missing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Put the tasks in lifecycle order, name the stage each belongs to and a Google Cloud tool for it, and say what, if anything, is missing.",
          parts: [
            part(
              "Ingestion and preparation",
              "Maps the copy task to data ingestion (Pub/Sub or BigQuery Data Transfer / Cloud Storage landing into BigQuery) and the cleaning/feature task to data preparation (BigQuery SQL / Dataflow / Dataprep-style tooling, Feature Store for reuse).",
              "Stage 1, data ingestion: landing point-of-sale history and the weather feed into BigQuery (via Cloud Storage loads, BigQuery Data Transfer Service or Pub/Sub for a live feed). Stage 2, data preparation: de-duplicating, filling gaps and building rolling-average features in BigQuery SQL or Dataflow, with reusable features kept in the Agent Platform Feature Store."
            ),
            part(
              "Training and deployment",
              "Maps fitting and tuning to model training (BigQuery ML or Agent Platform training with hyperparameter tuning) and the API task to model deployment (an Agent Platform endpoint, or batch predictions to a table).",
              "Stage 3, model training: fitting and tuning the forecaster in BigQuery ML (ARIMA_PLUS) or with Agent Platform training and hyperparameter tuning. Stage 4, model deployment: publishing the model behind an Agent Platform endpoint for the ordering system's API calls, or, since orders are placed daily, a nightly batch prediction written to a table the ordering system reads."
            ),
            part(
              "Management",
              "Maps retraining, versioning and alerts to model management (Agent Platform Pipelines for scheduled retraining, Model Registry for versions, Model Monitoring for drift and accuracy alerts).",
              "Stage 5, model management: Agent Platform Pipelines to run the weekly retraining, Model Registry to record which version is live and its lineage, and Model Monitoring to alert when input data drifts or accuracy on actual sales drops."
            ),
            part(
              "What is missing",
              "Identifies at least one gap: an evaluation/validation gate before deployment (and a baseline to beat), data governance and access controls on the sales data, or a responsible-AI/ownership step; frames it for the board.",
              "The plan jumps from training to serving with no evaluation gate: there is no stated accuracy target, no baseline (last year's sales) the model must beat, and no sign-off before a version reaches the ordering system. It also says nothing about who owns the data and its access controls in BigQuery. Ask the vendor to add an evaluation step with a target and a named business owner for each stage."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 2: Google Cloud's gen AI offerings (3) ----------------
    {
      slug: "match-needs-to-gemini-offerings",
      objective: "Recognizing the functionality, use cases, and business value of Gemini Enterprise: Notebook API, multimodal search, custom agent capabilities",
      kind: "build",
      title: "Match four employee needs to Google Cloud gen AI offerings",
      brief:
        "Castlemere Bank's COO asks you to recommend 'the right Google AI for each team' and warns against buying everything. Four needs: (1) Every employee wants help drafting emails, summarising long documents and building slides inside the tools they already use all day. (2) The compliance team wants to ask questions across policies, regulator letters, recorded meetings and internal wikis in one place, with answers that cite the source, and to build a few of their own assistants without engineers. (3) The contact centre wants virtual agents on phone and chat that can check a balance and hand off to a human with the conversation history. (4) The payments engineering team wants to build a custom agent into their own application that calls internal APIs, using a model they choose and tune. Name the offering for each and the business value.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the Google Cloud offering for each need, what it does for that team, and why not a different one.",
          parts: [
            part("Every employee", "Chooses Gemini for Google Workspace, because the need is assistance inside the productivity tools people already use (Gmail, Docs, Slides, Meet).", "Gemini for Google Workspace: drafting in Gmail and Docs, summarising documents and threads, generating slides in Slides, all inside the apps staff already use, with enterprise data protections. Value: broad productivity gains with no new tool to learn. Gemini Enterprise would be more than most employees need for this."),
            part("Compliance", "Chooses Gemini Enterprise for multimodal search across connected enterprise sources with cited answers and no-code custom agents (and its Notebook capability for working over a set of documents).", "Gemini Enterprise: it connects policies, regulator letters, meeting recordings and wikis into one searchable, multimodal corpus, answers with citations to the source, and lets the compliance team build their own agents without engineers; the notebook capability lets them reason over a chosen set of documents. Value: faster, auditable answers and self-service assistants."),
            part("Contact centre", "Chooses the Customer Engagement Suite (Conversational Agents for the virtual agent, Agent Assist for the human hand-off, Contact Center as a Service for telephony), because it is purpose-built for customer conversations with transactional actions and escalation.", "Customer Engagement Suite: Conversational Agents handle balance checks on phone and chat and hand off to a person with the transcript, Agent Assist supports the human after hand-off, and Google Cloud Contact Center as a Service provides the channels. Value: deflection of routine contacts and better hand-offs, with the hand-off requirement met out of the box."),
            part("Payments engineering", "Chooses the Agent Platform (Model Garden for model choice, tuning, and the agent-building tools) because the need is a custom-built agent with developer control over the model and tool calls into internal APIs.", "The Agent Platform: pick a model from Model Garden, tune it, and build a custom agent whose tools call the payments APIs, embedded in their own application. Value: full control over model, data and behaviour for a regulated, bespoke workflow. The packaged offerings above would not give that control."),
          ],
        },
      ],
    },
    {
      slug: "design-agent-tooling",
      objective: "Identifying how agents use tools to interact with the external environment: extensions, functions, data stores, plugins",
      kind: "build",
      title: "Design the tools for an expenses agent",
      brief:
        "Pendle & Marsh, a law firm, wants an internal agent that helps staff with expenses. Staff should be able to ask what the policy allows (the policy is 60 pages and changes twice a year), submit an expense by describing it in plain language, check the status of a claim, and book a compliant hotel. The firm's expenses system has an API; hotels are booked through a travel supplier's online service; the policy lives in the document management system. The CFO asks you to explain, without code, how the agent would actually do each of these things and what it should never be allowed to do on its own.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each capability, name the kind of tool the agent uses and how it keeps the agent grounded and safe.",
          parts: [
            part(
              "Policy questions",
              "Uses a data store (grounding the agent on the policy document via retrieval) rather than putting the policy in the model's training, so answers cite the current policy and update when it changes.",
              "A data store: the policy document is indexed so the agent retrieves the relevant passages and answers from them, citing the section. When the policy changes, re-indexing the new version updates the agent the same day, with no retraining. The model's own knowledge is never the source for policy answers."
            ),
            part(
              "Submitting and checking claims",
              "Uses functions (function calling) that map the user's request to structured calls on the expenses system's API (create claim with amount, category, date; get claim status), with the agent extracting parameters and confirming them before the call.",
              "Functions: define create_expense(amount, currency, category, date, description) and get_claim_status(claim_id) against the expenses API. The agent turns 'I had a 48 pound taxi to court on Tuesday' into the structured call, shows the filled-in fields for confirmation, then submits. Status checks call the second function and read back the result."
            ),
            part(
              "Hotel booking",
              "Uses an extension or plugin that connects the agent to the travel supplier's service, with the agent checking the policy data store first so only compliant options are offered.",
              "An extension (or plugin) to the travel supplier's booking service lets the agent search and reserve rooms. Before offering options, it consults the policy data store for the city's rate cap and preferred suppliers, so staff see only compliant choices."
            ),
            part(
              "Guardrails",
              "Sets limits: the agent acts only as the signed-in user with their permissions, requires explicit confirmation before any action that spends money or submits a claim, caps amounts, logs every tool call, and never approves claims (approval stays with humans).",
              "The agent acts with the signed-in user's own permissions, so it can never see or submit another person's claims. Any action that spends or claims money (submit, book) requires an explicit 'yes' from the user after a summary; bookings above a set amount route to a travel coordinator. Approving claims is not a tool at all: approval stays with managers. Every tool call is logged for audit."
            ),
          ],
        },
      ],
    },
    {
      slug: "contact-centre-engagement-suite",
      objective:
        "Recognizing the functionality, use cases, and business value of Google's Customer Engagement Suite: Conversational Agents, Agent Assist, Conversational Insights, Google Cloud Contact Center as a Service",
      kind: "build",
      title: "Map a contact centre's problems to the Customer Engagement Suite",
      brief:
        "Brackenridge Energy's contact centre has four problems the director wants solved in one programme. (1) 60% of calls are simple: meter readings, balance queries, payment dates; wait times are long. (2) Agents handling the complex calls spend minutes searching knowledge articles while the customer waits, and new agents take months to become confident. (3) Leadership has no idea why customers call, how sentiment trends, or which scripts fail, beyond a monthly survey. (4) The telephony platform is a 15-year-old on-premises system that cannot connect to modern AI. Map each problem to a component of Google's Customer Engagement Suite and the business value you would promise.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the component for each problem, what it does, and the measurable value.",
          parts: [
            part("Simple, high-volume calls", "Chooses Conversational Agents (virtual agents on voice and chat) to resolve meter readings, balances and payment dates end to end, with hand-off to humans for anything else; value in containment and shorter waits.", "Conversational Agents: virtual agents that take meter readings, read balances and payment dates on phone and chat, authenticating the customer and completing the task, and escalating to a person with context when needed. Value: a large share of the 60% simple calls contained, cutting queue times for everyone else."),
            part("Agent knowledge and ramp-up", "Chooses Agent Assist to surface knowledge articles and suggested responses to agents in real time during the call and to summarise it afterwards; value in handle time and faster onboarding.", "Agent Assist: listens to the live conversation and surfaces the right knowledge article and suggested replies as the customer talks, then drafts the after-call summary. Value: shorter handle times, fewer holds, and new agents performing like experienced ones sooner."),
            part("No insight into why customers call", "Chooses Conversational Insights to analyse every conversation for topics, sentiment and script outcomes; value in data-driven decisions replacing the monthly survey.", "Conversational Insights: analyses all calls and chats for topic, sentiment trend and where conversations go wrong, so leadership sees why customers call and which scripts fail across 100% of interactions rather than a survey sample. Value: prioritised fixes to products and processes, not just the contact centre."),
            part("Legacy telephony", "Chooses Google Cloud Contact Center as a Service to replace the on-premises platform with a cloud contact-centre that the other components plug into; value in retiring the legacy system and enabling the rest.", "Google Cloud Contact Center as a Service: a cloud telephony and omnichannel platform that replaces the 15-year-old system and natively hosts the virtual agents, Agent Assist and Insights above. Value: the legacy platform is retired and the AI capabilities become possible at all."),
          ],
        },
      ],
    },

    // ---------------- Section 3: Techniques to improve output (2) ----------------
    {
      slug: "fix-pilot-output-problems",
      objective: "Describing Google Cloud-recommended practices to address model limitations: grounding, retrieval-augmented generation, prompt engineering, fine-tuning, human in the loop",
      kind: "case",
      title: "Fix a policy assistant pilot that keeps getting things wrong",
      brief:
        "You sponsor a pilot at Thornbury Council: a generative AI assistant that answers residents' questions about bin collections, parking permits and council tax. The pilot uses a foundation model with a short instruction prompt and nothing else. You are reviewing the first two weeks of results with the delivery team.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The assistant confidently states collection days and permit prices that are wrong or out of date, and when asked about a new garden-waste scheme launched last month it says the scheme does not exist.",
          ask: "What limitation is this and which practice fixes it?",
          parts: [
            part(
              "Limitation and fix",
              "Identifies hallucination and the knowledge cutoff (the model is answering from general training, not council data) and prescribes grounding with retrieval-augmented generation over the council's current documents, with answers citing the source.",
              "Two limitations at once: hallucination (plausible but wrong days and prices) and the knowledge cutoff (it knows nothing after its training date, so the new scheme 'does not exist'). The fix is grounding: connect the assistant to the council's current web pages and policy documents through retrieval-augmented generation, so each answer is built from retrieved passages and cites them, and new schemes appear as soon as their pages are indexed."
            ),
          ],
        },
        {
          text: "With grounding in place, facts are right. But answers are long, use bureaucratic language, switch between formal and chatty tone, and sometimes answer a different question than the resident asked.",
          ask: "What do you change now?",
          parts: [
            part(
              "Prompt engineering",
              "Applies prompt engineering: a clear system prompt with role, tone, length and format rules, few-shot examples of good answers, and instructions to restate or clarify the question when ambiguous; notes fine-tuning is not yet warranted.",
              "This is a prompting problem, not a knowledge problem. Rewrite the system prompt: role ('a friendly council information assistant'), plain-English tone, a maximum length, a fixed answer structure (direct answer, then the next step, then the source), and three or four examples of ideal answers (few-shot). Add an instruction to ask a clarifying question when the request could mean two things. Measure again before considering anything costlier."
            ),
          ],
        },
        {
          text: "Two months on, residents love it for simple questions. The council now wants it to handle council-tax hardship applications, where a wrong answer can cost a vulnerable resident money, and the policy team wants answers to follow the council's exact phrasing and legal caveats, which the prompt cannot fully enforce.",
          ask: "What would you add for the high-stakes workflow and the phrasing requirement?",
          parts: [
            part(
              "Human in the loop",
              "Adds a human-in-the-loop step for hardship cases: the assistant drafts and gathers information, but a trained officer reviews and sends decisions or advice, with the assistant flagging uncertainty and never giving a final determination.",
              "For hardship applications the assistant should assist, not decide: it collects the information, drafts a response and shows the officer the sources, and a trained officer reviews and sends it. Low-confidence or sensitive cases are routed straight to a person. The cost of a wrong answer to a vulnerable resident is too high for the model to be the last step."
            ),
            part(
              "Fine-tuning",
              "Considers fine-tuning the model on the council's approved responses to lock in phrasing and caveats that prompting cannot reliably enforce, while keeping grounding for facts, and weighs its cost and maintenance against the benefit.",
              "When exact phrasing and mandatory legal caveats must appear every time and prompts have hit their limit, fine-tune on a set of approved, policy-checked answers so style and caveats are learned rather than instructed; keep RAG for the facts, because tuning does not update knowledge. Weigh the cost of building and maintaining the tuned model and the evaluation set against the benefit, and re-tune when policy wording changes."
            ),
          ],
        },
      ],
    },
    {
      slug: "set-sampling-parameters",
      objective: "Identifying how sampling parameters control gen AI model behavior: token count, temperature, top-p, safety settings, output length",
      kind: "build",
      title: "Set sampling parameters for three uses of one model",
      brief:
        "Weatherby Publishing uses one foundation model in three ways and the team has left every setting at its default. (1) Extracting the author, title and ISBN from scanned contracts into a fixed form, where any variation between runs breaks the downstream system. (2) Brainstorming thirty alternative headlines for an article, where variety is the point. (3) A public-facing children's book recommender that must never produce unsuitable content and must answer in two or three sentences. For each, say how you would set temperature, top-p, output length or token limits, and safety settings, and why.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each use, give the parameter settings and the reasoning.",
          parts: [
            part(
              "Contract extraction",
              "Sets temperature at or near 0 (and/or a low top-p) for deterministic, repeatable output, constrains the output format (a fixed schema), and sets the token limit just above the longest expected form.",
              "Temperature 0 (or as low as the model allows) and a low top-p so the most likely tokens are chosen every time, making runs repeatable; ask for a fixed JSON-style form so the downstream system always gets the same fields; and set the maximum output tokens a little above the longest form so the model cannot ramble. Creativity here is a defect."
            ),
            part(
              "Headline brainstorming",
              "Raises temperature (and keeps top-p high) to increase diversity, asks for the list explicitly, and sets an output length large enough for thirty items.",
              "A higher temperature (for example around 0.9-1.0) with top-p near 1 widens the range of tokens considered, so the thirty headlines differ in angle and wording rather than being near-duplicates; set the output token limit high enough for all thirty and ask for them as a numbered list. Editors then pick, so variety beats precision."
            ),
            part(
              "Children's recommender",
              "Sets safety settings to the strictest thresholds (block low-probability harmful content across categories), uses a moderate-to-low temperature for reliable tone, and caps output length to enforce two or three sentences.",
              "Safety settings at the strictest level for every harm category so anything borderline is blocked, since the audience is children and the product is public; a lowish temperature (around 0.2-0.4) for consistent, sensible recommendations; and a small maximum output token count plus a prompt instruction so answers stay to two or three sentences. Length and safety limits are enforced by settings, not hoped for in the prompt."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 4: Business strategies (2) ----------------
    {
      slug: "measure-gen-ai-impact",
      objective: "Identifying techniques to measure the impact of a gen AI initiative",
      kind: "build",
      title: "Define how a support-summarisation pilot will be measured",
      brief:
        "Allerton Software plans a three-month pilot: a generative AI tool that summarises each customer-support ticket's history so engineers can start work faster. The CFO will fund a full rollout only on evidence. Before the pilot starts, write the measurement plan: the business outcomes and their metrics, how you will know the tool caused any change, the quality and risk measures, and what result would count as success or failure.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the measurement plan.",
          parts: [
            part(
              "Outcome metrics and baseline",
              "Names measurable business outcomes tied to the goal (time from ticket assignment to first engineer action, time to resolution, tickets per engineer per week, customer satisfaction) and establishes a baseline from the months before the pilot.",
              "Primary metric: median time from assignment to first meaningful engineer action; secondary: time to resolution, tickets closed per engineer per week, and the customer satisfaction score on closed tickets. Measure all four for the three months before the pilot to set the baseline, from the ticketing system's own timestamps rather than self-report."
            ),
            part(
              "Attribution",
              "Uses a comparison group (A/B: half the teams or a random half of tickets get summaries, the rest do not) over the same period, so seasonal or product changes affect both groups and the difference is attributable to the tool.",
              "Randomly assign half of incoming tickets (or alternate teams) to receive summaries and half not, for the whole pilot. Compare the metrics between groups over the same weeks, so a product release or holiday affects both equally and any gap is the tool's effect. A before-and-after comparison alone would be confounded."
            ),
            part(
              "Quality and risk measures",
              "Tracks the tool's own quality and risk: engineer-rated usefulness and accuracy of summaries, the rate of factual errors or missed critical details found on review of a sample, adoption (how often summaries are opened and used), and cost per ticket.",
              "Each summary gets a one-click usefulness rating from the engineer; a weekly random sample is reviewed against the ticket for missed or invented facts, with the error rate tracked; adoption is the share of assigned tickets whose summary was read; and the model cost per ticket is logged so the value calculation includes it."
            ),
            part(
              "Decision rule",
              "States in advance the thresholds for success, failure and extension (for example a meaningful reduction in time to first action with no rise in error-driven rework and cost per ticket below the time saved), so the CFO's decision is pre-agreed.",
              "Agree with the CFO before starting: full rollout if time to first action falls by at least 20% versus the control group, resolution time does not worsen, the summary error rate stays under an agreed ceiling and the cost per ticket is below the value of engineer time saved; stop if the primary metric moves less than 5%; extend the pilot if the result is in between. Writing this down first stops the result being argued afterwards."
            ),
          ],
        },
      ],
    },
    {
      slug: "sequence-gen-ai-adoption",
      objective: "Identifying the steps to integrate gen AI into an organization",
      kind: "case",
      title: "Sequence a company's first year of generative AI",
      brief:
        "You have just been appointed head of AI at Dunmore Foods, a 4,000-person manufacturer with no generative AI in production. The CEO has returned from a conference wanting 'AI in every department by Christmas'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The CEO asks for a plan in two weeks and has already forwarded you 27 ideas from department heads, from an AI recipe generator to automated invoice matching.",
          ask: "What do you do first, and how do you narrow 27 ideas?",
          parts: [
            part(
              "Start with the business problem",
              "Begins by defining business objectives and assessing readiness (data, skills, security posture) rather than picking technology, and scores the 27 ideas on value, feasibility (data availability, risk, integration effort) and strategic fit to select two or three pilots.",
              "Before any technology choice, agree with the executive team what the business is trying to achieve (margin, waste, customer service) and assess readiness: what data exists and in what state, who has the skills, and what the security and governance posture is. Score the 27 ideas on business value, feasibility (is the data available and clean, how risky is a wrong output, how hard is integration) and fit with the objectives, and pick two or three pilots with a clear owner and a measurable outcome each."
            ),
            part(
              "Managing the Christmas expectation",
              "Resets the expectation to a phased plan (pilot, evaluate, scale) with visible milestones, explaining that broad rollout without pilots risks cost, security and reputation.",
              "Offer the CEO a phased plan: two or three pilots live within a quarter, measured results by Christmas, and scaling of what works in the new year. Explain that putting unproven AI into every department at once spreads thin budget, creates uncontrolled data exposure and risks a public failure that sets the programme back a year."
            ),
          ],
        },
        {
          text: "Two pilots are chosen: invoice matching in finance and a product-knowledge assistant for the sales team. The security team now objects that customer and supplier data will be 'sent to an AI'.",
          ask: "What must be in place before the pilots touch real data?",
          parts: [
            part(
              "Foundations",
              "Puts governance and security foundations in place: data classification and access controls (IAM), an enterprise platform where data is not used to train vendor models and stays in the company's environment, a responsible-AI policy with human oversight, and a small cross-functional team (business, data, security, legal).",
              "Set up the foundations first: classify the data the pilots will use and apply least-privilege access; run the pilots on an enterprise platform (for example the Agent Platform) in the company's own cloud project, where prompts and data are not used to train the vendor's models; adopt a short responsible-AI policy covering human review of outputs, transparency to users and incident handling; and form a cross-functional team of business owner, data lead, security and legal. Give the security team a seat, not a veto by surprise."
            ),
          ],
        },
        {
          text: "Both pilots run for a quarter. Invoice matching cuts processing time substantially with few errors; the sales assistant is liked but gives occasionally wrong product specifications.",
          ask: "What are the next steps for each, and how does the organisation scale from here?",
          parts: [
            part(
              "Scale what works, fix what does not",
              "Scales invoice matching with change management (training, process redesign, monitoring in production), fixes the sales assistant's accuracy (grounding on the product catalogue, evaluation) before expanding it, and builds reusable platform, governance and skills so later use cases start faster.",
              "Invoice matching: move to production with monitoring, train the finance team, redesign the process around the tool and track the metric monthly. Sales assistant: do not scale yet; ground it on the authoritative product catalogue and add an evaluation set of specification questions it must pass, then re-pilot. Organisationally, turn the pilot team into a centre of excellence that owns the platform, the governance checklist, the evaluation methods and training, so the next ideas from the 27 go through a repeatable path rather than starting from zero."
            ),
          ],
        },
      ],
    },
  ],
};
