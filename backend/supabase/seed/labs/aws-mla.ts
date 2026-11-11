import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-154: AWS Certified Machine Learning Engineer - Associate (MLA-C02).
//
// Aligned to the MLA-C02 exam guide's four domains (Data Preparation for ML
// and AI 28%, ML Model and Foundation Model Development 24%, Deployment and
// Orchestration of ML and AI Workflows 24%, Operating, Monitoring, and
// Securing ML and AI Solutions 24%; 50 scored + 15 unscored questions, pass
// 720; checked 2026-11-07). The track teaches MLA-C02 (beta from
// 2026-09-29), not the retiring MLA-C01, and so do these labs: generative
// AI (Bedrock knowledge bases, guardrails) sits beside classical ML.
//   https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html
// Density (docs/labs.md, policy "hybrid"): 3 / 3 / 2 / 2.
//
// Figures, each read on the named AWS documentation page on 2026-11-07:
//   - Bedrock knowledge base chunking (fixed-size with max tokens and
//     overlap percentage; default about 300 tokens; hierarchical with
//     parent/child token sizes; semantic with buffer size and breakpoint
//     percentile; no chunking; custom Lambda transformation):
//     https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html
//   - Bedrock S3 data source metadata files (<file>.metadata.json beside the
//     document, metadataAttributes, 10 KB limit, includeForEmbedding):
//     https://docs.aws.amazon.com/bedrock/latest/userguide/s3-data-source-connector.html
//   - SageMaker automatic model tuning strategies (grid, random, Bayesian,
//     Hyperband; Hyperband's internal early stopping):
//     https://docs.aws.amazon.com/sagemaker/latest/dg/automatic-model-tuning-how-it-works.html
//   - SageMaker inference options (real-time: payloads up to 25 MB, 60 s
//     responses, 8 min streaming; serverless: 4 MB, 60 s; asynchronous: up
//     to 1 GB, up to one hour, scale to zero; batch transform: GBs, days):
//     https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model-options.html
//   - SageMaker deployment guardrails (blue/green all-at-once, canary,
//     linear; rolling; baking period with CloudWatch alarms; real-time and
//     asynchronous endpoints only):
//     https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails.html
//   - Bedrock Guardrails policies (content filters incl. prompt attacks,
//     denied topics, word filters, sensitive information filters block or
//     mask, contextual grounding checks, Automated Reasoning checks,
//     ApplyGuardrail API):
//     https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html
// No model names, prices or per-token figures are quoted: those change
// between releases and the exam does not test them.

export const AWSMLA_LABS: SeedLabSet = {
  trackCode: "AWSMLA",
  sources: [
    source("https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html", "exam_outline", "2026-11-07"),
    source("https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/bedrock/latest/userguide/s3-data-source-connector.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/sagemaker/latest/dg/automatic-model-tuning-how-it-works.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model-options.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Domain 1: Data Preparation for ML and AI (3)
    // ----------------------------------------------------------------------
    {
      slug: "rag-chunking-and-metadata-plan",
      objective: "Preparing documents for Retrieval Augmented Generation: chunking strategies and metadata extraction",
      kind: "build",
      title: "Prepare a policy library for a Bedrock knowledge base",
      brief:
        "Aldwyn Mutual, an insurer, wants a support assistant that answers agents' questions from 4,000 policy documents stored in S3: long PDFs with numbered sections, FAQ pages of short independent paragraphs, and product sheets with large tables. Each document belongs to one product line and one country, and agents must only get answers from documents for the product and country of the customer they are serving. Early tests with default settings returned chunks that cut sections in half and mixed countries. Write the document preparation plan for an Amazon Bedrock knowledge base.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the chunking and metadata plan.",
          parts: [
            part(
              "Chunking for long structured documents",
              "Chooses hierarchical chunking for the sectioned PDFs (small child chunks for precise retrieval, larger parent chunks returned for context, with an overlap in tokens), or semantic chunking (sentence-boundary chunks split where meaning shifts, with a buffer size and breakpoint percentile threshold) and explains why default fixed-size cuts sections.",
              "Hierarchical chunking for the policy PDFs: child chunks of a few hundred tokens are what gets matched, and the larger parent chunk (say 1,500 tokens) is what gets returned, so a matched sentence comes back with its whole section; set overlap tokens between neighbors. Default chunking is roughly 300-token pieces that respect sentences but not sections, which is why clauses were being cut in half. Semantic chunking is the alternative when sections are not clearly marked."
            ),
            part(
              "Chunking for FAQs and tables",
              "Uses fixed-size chunking with a small maximum token count and overlap percentage for the short independent FAQ paragraphs (or no chunking if each FAQ entry is already its own file), and for the product sheets relies on the parser's table handling or a custom transformation Lambda so a table is not split mid-row.",
              "FAQ pages: fixed-size chunking with a modest maxTokens and an overlap percentage so each paragraph stays whole, or split them so each Q&A is its own file and choose 'no chunking' (one document = one chunk). Product sheets: enable the advanced/foundation-model parsing so tables are kept as units, or run a custom transformation Lambda that emits one chunk per table."
            ),
            part(
              "Metadata for filtering",
              "Adds a sidecar metadata file for each document named <document>.metadata.json in the same S3 location, with metadataAttributes for product_line and country (string values), within the 10 KB limit, and uses them as retrieval filters so a query for a UK home-insurance customer only retrieves matching documents.",
              'Beside each file, for example policies/home-uk-2026.pdf, add policies/home-uk-2026.pdf.metadata.json containing {"metadataAttributes":{"product_line":"home","country":"UK"}} (under 10 KB). At query time the Retrieve / RetrieveAndGenerate call passes a filter such as product_line equals "home" and country equals "UK", so other countries\' documents cannot be retrieved -- a filter, not a prompt instruction.'
            ),
            part(
              "Evaluation before launch",
              "Builds a small evaluation set of agent questions with known source passages and measures retrieval (is the right chunk in the top-k) per chunking configuration before fixing the choice, because the chunking strategy cannot be changed after the data source is connected without re-ingesting.",
              "Write 50-100 real agent questions with the passage that answers each, ingest a sample under each candidate configuration into separate data sources, and measure how often the correct passage is in the top 5 retrieved chunks. Decide on the evidence: the chunking strategy of a data source cannot be changed afterwards, so getting it wrong means re-ingesting everything."
            ),
          ],
        },
      ],
    },
    {
      slug: "class-imbalance-fraud-plan",
      objective: "Resolving class imbalance in numeric, text, and image datasets",
      kind: "build",
      title: "Prepare an imbalanced fraud dataset for training",
      brief:
        "Brennan Pay has 18 million card transactions from the last year, of which 0.3% are confirmed fraud. A first model trained on the raw data reports 99.7% accuracy and the fraud team says it 'catches nothing'. The data has numeric features (amount, time since last transaction), categorical features (merchant category) and a short free-text merchant descriptor. Write the data-preparation and evaluation plan that makes the next model useful.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the imbalance-handling plan.",
          parts: [
            part(
              "Why accuracy misleads",
              "Explains that with 0.3% positives a model predicting 'not fraud' for everything scores 99.7% accuracy, so accuracy is uninformative; chooses metrics that reflect the minority class: precision, recall, F1, precision-recall AUC (preferred over ROC AUC under heavy imbalance), and a confusion matrix at the chosen threshold.",
              "A model that never predicts fraud is 99.7% accurate here, so accuracy says nothing. Evaluate with recall and precision on the fraud class, the precision-recall curve and its AUC (ROC AUC can look fine while PR-AUC is poor at 0.3% prevalence), and report the confusion matrix at the operating threshold."
            ),
            part(
              "Splitting",
              "Uses a stratified split (or a time-based split that preserves the fraud rate in each part) so the validation and test sets contain enough positives, and never resamples the test set; keeps the test set at the real-world prevalence.",
              "Split by time (train on earlier months, validate and test on later ones to mimic deployment) while checking each part keeps roughly 0.3% fraud, or stratify by label. Resampling is applied to the training set only; validation and test stay at the true prevalence so the metrics mean something in production."
            ),
            part(
              "Rebalancing the training data",
              "Applies one or more of: class weights in the loss (for example scale_pos_weight for XGBoost, roughly the negative/positive ratio), random undersampling of the majority class, oversampling or synthetic minority samples (SMOTE) for numeric features -- noting SMOTE is not suitable for the text feature -- and explains the trade-offs (undersampling discards data, oversampling risks overfitting to duplicates).",
              "Start with class weights: in XGBoost set scale_pos_weight near the negative-to-positive ratio (about 330) so misclassified fraud costs more. If more is needed, undersample the legitimate class (keeping all fraud) to a 1:10 or 1:20 ratio, or generate synthetic fraud rows with SMOTE on the numeric and encoded categorical features -- not on the raw text, where synthetic interpolation is meaningless. Undersampling throws away signal; oversampling can overfit to repeated minority rows, so validate each choice on the untouched validation set."
            ),
            part(
              "Threshold and bias check",
              "Tunes the decision threshold on the validation set to the business trade-off (for example a recall target at an acceptable false-positive rate) rather than 0.5, and checks the resampled data has not introduced bias across groups (for example merchant category or region) using SageMaker Clarify's pre-training and post-training bias metrics.",
              "Pick the threshold from the validation PR curve to hit, say, 80% recall at a false-positive rate the review team can handle, instead of 0.5. Run SageMaker Clarify bias metrics (class imbalance per facet, difference in positive proportions) across merchant category and region before and after resampling, because oversampling can amplify a skew that was already there."
            ),
          ],
        },
      ],
    },
    {
      slug: "pii-masking-support-transcripts",
      objective: "Masking, redacting, and anonymizing data",
      kind: "case",
      title: "De-identify support transcripts for model training",
      brief:
        "Calder Telecom wants to fine-tune a model on 2 million customer-support chat transcripts stored in S3. The transcripts contain names, phone numbers, account numbers, addresses and occasional payment card numbers. Legal requires that no direct identifiers reach the training set, that analysts can still join transcripts belonging to the same customer, and that the de-identification be auditable.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The data science team proposes a regular expression script for phone and card numbers and says names are 'too hard' so they will leave them in.",
          ask: "What do you propose instead for finding and removing identifiers in free text?",
          parts: [
            part(
              "Detection",
              "Uses Amazon Comprehend PII detection (DetectPiiEntities or an asynchronous PII entities job, with redaction output) to find names, addresses, phone numbers, card numbers and account identifiers in free text, supplemented by regex for the account-number format Comprehend does not know; names are in scope, not optional.",
              "Run an asynchronous Amazon Comprehend PII entities job over the transcripts with redaction enabled: it detects names, addresses, phone numbers, credit/debit card numbers, emails and more in free text, far beyond what a regex can do. Add a custom regex only for Calder's own account-number pattern. Names are direct identifiers and must be handled."
            ),
            part(
              "Redaction style",
              "Replaces each entity with a type token (for example [NAME], [PHONE]) rather than deleting it, so the text stays grammatical and the model still learns the structure of a conversation; stores the redacted copies in a separate bucket/prefix with the originals locked down.",
              "Replace entities with placeholders by type ([NAME], [PHONE], [CARD], [ACCOUNT]) so sentences remain natural for training. Write the output to a dedicated 'deidentified' bucket; the raw bucket stays restricted to the few roles that need it and is never a training data source."
            ),
          ],
        },
        {
          text: "Redaction works, but analysts complain they can no longer group transcripts by customer, and legal asks how you will prove what was removed.",
          ask: "How do you keep customer-level joins without identifiers, and how do you make the process auditable?",
          parts: [
            part(
              "Pseudonymisation",
              "Replaces the customer identifier with a consistent pseudonym produced by a keyed hash (HMAC with a secret in AWS Secrets Manager or a KMS-backed key) or a tokenization table kept in a separate restricted store, so the same customer always maps to the same token while the mapping is not derivable from the data; explains why a plain hash of a phone number is reversible by brute force.",
              "Derive a customer token with an HMAC (SHA-256) of the account id using a secret held in Secrets Manager (or a KMS-protected key) -- the same customer always gets the same token, but without the secret nobody can recompute it. A plain SHA-256 of a phone number is not anonymization: the input space is small enough to brute-force. If the mapping must ever be reversed under legal process, use a tokenization table in a locked-down DynamoDB table instead."
            ),
            part(
              "Audit",
              "Keeps Comprehend job outputs (entity offsets and types per document), runs Amazon Macie on the de-identified bucket to confirm no sensitive data remains, and records the pipeline in CloudTrail and a Glue/Step Functions job log so the process and its results can be shown to legal.",
              "Retain the Comprehend job's entity output (document, offset, type, confidence) as the record of what was removed. Run a Macie sensitive-data discovery job on the de-identified bucket and treat any finding as a pipeline bug. CloudTrail covers who ran what; the Step Functions execution history shows each batch's steps and counts."
            ),
          ],
        },
        {
          text: "Six months later the model is in production and a new transcript source includes screenshots (images) customers pasted into chat.",
          ask: "How does the de-identification plan change for images?",
          parts: [
            part(
              "Images",
              "Extends the pipeline: Amazon Textract (or Rekognition DetectText) to pull text from images and run it through the same PII detection, Rekognition face detection to blur faces if people appear, and a policy decision on whether images are excluded from training altogether; notes that the text-only guardrails do not see pixels.",
              "Run images through Amazon Textract to extract any text and send that text through the Comprehend PII step; use Rekognition face detection to find and blur faces; and decide with legal whether images are in scope for training at all -- the simplest control is to exclude them. Text-based redaction never sees what is inside a picture, so an unchanged pipeline would leak."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 2: ML Model and Foundation Model Development (3)
    // ----------------------------------------------------------------------
    {
      slug: "select-foundation-model-evaluation",
      objective: "Evaluating and selecting foundation models in Amazon Bedrock against task requirements and performance criteria",
      kind: "build",
      title: "Run a model bake-off for a claims summarization assistant",
      brief:
        "Marchbank Insurance wants a Bedrock-hosted assistant that summarizes 20-page claim files into a one-page brief for adjusters. Requirements: summaries must not invent facts; the 95th-percentile response time must stay under 8 seconds for a 15,000-token input; cost per summary must fit a stated budget; French and English files are both common; outputs must follow a fixed section template. Three candidate models are available in Bedrock. Design the evaluation that chooses one.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the model evaluation plan.",
          parts: [
            part(
              "Hard requirements first",
              "Screens candidates on non-negotiables before quality testing: context window large enough for 15,000-token inputs plus the prompt, language support for French, availability in the required Region and compliance scope, and measured p95 latency at the real input size.",
              "Eliminate before you evaluate: each model must accept at least ~16k input tokens, handle French and English, be available in the deployment Region, and meet p95 latency under 8 s on real 15,000-token files (measure it; published figures are for short prompts). A model that fails any of these is out regardless of quality."
            ),
            part(
              "Quality evaluation",
              "Builds a held-out set of real (de-identified) claim files with reference briefs and runs a Bedrock model evaluation job: automatic metrics where they fit (for example ROUGE or BERTScore against references), an LLM-as-a-judge evaluation for faithfulness/completeness/template adherence, and a human evaluation by adjusters on a sample for the final call.",
              "Use 200 de-identified claim files with adjuster-written reference briefs. Run a Bedrock model evaluation job per candidate: automatic metrics such as ROUGE and BERTScore against the references for coverage, an LLM-as-a-judge evaluation scoring faithfulness (no unsupported statements), completeness and template compliance, and a human evaluation workflow where adjusters rank summaries for a 30-file sample. Judge scores guide; adjusters decide."
            ),
            part(
              "Hallucination control in the measure",
              "Treats 'no invented facts' as the primary metric (faithfulness / grounding against the source file, with a failure rate reported) rather than fluency, and tests prompt engineering per model fairly (same template instructions, same few-shot examples) so the comparison is of models, not prompts.",
              "Report, per model, the share of summaries containing any statement not supported by the file (judge-flagged, human-verified) -- that number ranks the candidates, fluency does not. Give every model the same system prompt, section template and two worked examples so the comparison is apples to apples; only then tune the winner's prompt."
            ),
            part(
              "Cost and the decision",
              "Computes cost per summary from measured input and output token counts at each model's price (not quoted here; read from the current price list) and picks the cheapest model that passes the hard requirements and the faithfulness bar, documenting the decision and the evaluation set for re-running when models change.",
              "Multiply the measured average input tokens (about 15,000 plus prompt) and output tokens (about 700) by each model's current per-token prices to get cost per summary, then choose the lowest-cost model that clears the latency, language, faithfulness and template bars. Keep the evaluation set and job definitions so the bake-off can be re-run when a new model version appears."
            ),
          ],
        },
      ],
    },
    {
      slug: "hyperparameter-tuning-job-design",
      objective: "Hyperparameter optimization with SageMaker AI automatic model tuning",
      kind: "build",
      title: "Configure a SageMaker tuning job for a churn model",
      brief:
        "Thornbury Broadband trains an XGBoost churn classifier on SageMaker AI. Hand-tuning has stalled at a validation AUC of 0.81. The team has a budget of about 60 training jobs' worth of compute, wants results within a day, and has candidate ranges for max_depth (3-10), eta (0.01-0.3), min_child_weight (1-10), subsample (0.5-1.0) and num_round (100-1000). Write the automatic model tuning configuration.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the tuning job configuration.",
          parts: [
            part(
              "Objective and ranges",
              "Sets the objective metric to validation AUC (maximize, the metric the algorithm emits, for example validation:auc), declares integer ranges for max_depth, min_child_weight and num_round and continuous ranges for eta and subsample, and uses logarithmic scaling for eta because its sensible values span orders of magnitude.",
              "Objective: maximize validation:auc. Ranges: max_depth integer 3-10, min_child_weight integer 1-10, num_round integer 100-1000, subsample continuous 0.5-1.0, eta continuous 0.01-0.3 with logarithmic scaling (0.01 and 0.1 should be explored as evenly as 0.1 and 0.3)."
            ),
            part(
              "Strategy",
              "Chooses Bayesian optimization for a 60-job budget (it learns from completed jobs to pick promising combinations), or Hyperband if the algorithm reports the metric per iteration (num_round makes XGBoost iterative) to stop poor configurations early; explains why grid search is impractical over five dimensions and random search wastes budget.",
              "Bayesian optimization: with ~60 jobs it models the metric as a function of the hyperparameters and concentrates later jobs where AUC is likely to improve. Hyperband is the alternative here because XGBoost reports validation AUC each round, so Hyperband can stop weak configurations early and spend the saved time on more candidates. Grid search over five ranges would need far more than 60 jobs; random search ignores what earlier jobs learned."
            ),
            part(
              "Budget and parallelism",
              "Sets max training jobs around 60 and max parallel jobs small enough that Bayesian optimization can learn between rounds (for example 4-6), explaining the trade-off: more parallel jobs finish sooner but each round has less information; enables early stopping (Auto) for Bayesian, or leaves TrainingJobEarlyStoppingType OFF when using Hyperband's internal early stopping.",
              "MaxNumberOfTrainingJobs 60, MaxParallelTrainingJobs 5: ten rounds of five, each round informed by the last; running all 60 at once would be plain random search. With Bayesian, set TrainingJobEarlyStoppingType to Auto so jobs whose AUC is tracking badly are stopped. If using Hyperband, set it to OFF and let Hyperband's own early stopping work."
            ),
            part(
              "Reuse and reproducibility",
              "Uses warm start from the previous tuning job (IdenticalDataAndAlgorithm, or TransferLearning if data changed) so earlier results seed the new search, fixes the data split and seeds for comparability, and records the best job's hyperparameters and artifacts in the Model Registry / MLflow for the next retraining.",
              "Warm-start the new tuning job from the previous one (IdenticalDataAndAlgorithm) so its 60 jobs are not spent rediscovering what the hand-tuning already learned. Keep the same train/validation split and seed across jobs so AUC differences are from hyperparameters. Register the best training job's model and hyperparameters in the SageMaker Model Registry (and log the experiment in MLflow) so retraining starts from a known point."
            ),
          ],
        },
      ],
    },
    {
      slug: "overfitting-and-forgetting-case",
      objective: "Preventing overfitting, underfitting, and catastrophic forgetting",
      kind: "case",
      title: "Diagnose three training problems on one product-classification project",
      brief:
        "Orrin Retail is building a product-category classifier. Two models are involved over the project: a convolutional network trained from scratch on 200,000 product images, and later a fine-tuned foundation model that turns product descriptions into structured attributes. You are the ML engineer reviewing training runs.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Run 1 (image model): training loss falls steadily to near zero over 40 epochs; validation loss falls until epoch 9, then rises every epoch after. Validation accuracy peaks at epoch 9 and declines.",
          ask: "What is happening, and what do you change?",
          parts: [
            part(
              "Diagnosis",
              "Identifies overfitting: the model keeps fitting the training set after it stops generalizing, shown by diverging training and validation loss from epoch 9.",
              "Classic overfitting. From epoch 9 the network is memorizing training images -- training loss keeps dropping while validation loss rises -- so later epochs make the model worse on new data."
            ),
            part(
              "Remedies",
              "Applies early stopping on validation loss (keep the epoch-9 checkpoint), regularization (dropout, weight decay/L2), data augmentation (flips, crops, color jitter), possibly a smaller model or more data; and avoids tuning on the test set.",
              "Stop early on validation loss with patience and keep the best checkpoint (epoch 9 here). Add dropout and weight decay, and augment the images (random crops, flips, color jitter) so each epoch sees varied inputs. If it still overfits, reduce model capacity or get more labeled data. Tune all of this on the validation set, never the test set."
            ),
          ],
        },
        {
          text: "Run 2 (image model, after the changes): training and validation loss both plateau high, and training accuracy itself is only 62% after 40 epochs. The team added heavy dropout to every layer and reduced the network to two convolutional layers.",
          ask: "What is happening now, and how do you fix it?",
          parts: [
            part(
              "Diagnosis and fix",
              "Identifies underfitting (the model cannot fit even the training data: high bias from too little capacity and too much regularization) and fixes it by restoring capacity (more layers/filters), reducing dropout, training longer or with a better learning rate, checking the input pipeline/labels, or using a pretrained backbone (transfer learning).",
              "Underfitting: a two-layer network with heavy dropout cannot represent the task, so training accuracy is stuck at 62% -- the remedies for Run 1 were overapplied. Restore depth (or use a pretrained image backbone and fine-tune it), cut dropout to a modest level, check the learning rate (too low also plateaus), verify labels and preprocessing, and train until the validation loss stops improving."
            ),
          ],
        },
        {
          text: "Run 3 (text model): the team fully fine-tunes a foundation model on 30,000 product descriptions to output JSON attributes. It now extracts attributes well, but when asked to write a plain product description in French -- something the base model did well -- it produces broken output, and it also fails on product types that were rare in the fine-tuning set.",
          ask: "What has happened, and how would you fine-tune differently?",
          parts: [
            part(
              "Diagnosis",
              "Identifies catastrophic forgetting: full fine-tuning on a narrow dataset overwrote the base model's general capabilities (multilingual generation) and biased it towards the common product types.",
              "Catastrophic forgetting. Updating every weight on a narrow, repetitive JSON-extraction dataset overwrote what the base model knew about general writing and French, and skewed it towards the product types that dominated the 30,000 examples."
            ),
            part(
              "Fine-tuning differently",
              "Uses parameter-efficient fine-tuning (for example LoRA adapters) that leaves the base weights frozen, a lower learning rate and fewer epochs, mixes in replay data (general and multilingual examples, and more examples of rare product types) so the distribution is balanced, and evaluates on general-capability tests as well as the task; or avoids fine-tuning altogether with prompt engineering / RAG if extraction can be done that way.",
              "Fine-tune with LoRA (or another parameter-efficient method) so the base weights stay intact and the task lives in small adapters; use a lower learning rate and fewer epochs; and mix replay data into the training set -- general text, French examples and oversampled rare product types -- so the model is not pulled toward one narrow distribution. Add a held-out check of general abilities (French description writing) to the evaluation. If structured extraction can be achieved with a strong prompt and examples, consider not fine-tuning at all."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 3: Deployment and Orchestration of ML and AI Workflows (2)
    // ----------------------------------------------------------------------
    {
      slug: "choose-inference-option",
      objective: "Selecting inference strategies: real-time versus batch",
      kind: "build",
      title: "Pick the SageMaker inference option for four workloads",
      brief:
        "Halvern Health has four models to serve on SageMaker AI. (1) A triage model called from a clinic web app: about 50 requests per second during the day, 300 ms response needed, 20 KB inputs. (2) A document-understanding model that takes scanned referral bundles of 200-600 MB and takes 10-25 minutes per document; a few hundred a day arrive in bursts. (3) A nightly risk-score refresh over all 9 million patient records, results written to a table by 06:00. (4) An internal research model called a few dozen times a day at unpredictable times, 1 MB inputs, where paying for an idle instance is not acceptable.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the inference option for each workload and give the deciding reason.",
          parts: [
            part(
              "Clinic triage",
              "Chooses a real-time endpoint (persistent, low latency, sustained traffic, auto scaling on invocations per instance) and notes that real-time responses are bounded at 60 seconds (payloads up to 25 MB), which this easily fits.",
              "Real-time inference endpoint behind the web app: persistent instances for sustained 50 req/s with low latency, auto scaling on InvocationsPerInstance. The 20 KB inputs and 300 ms responses are far inside the real-time limits (payloads up to 25 MB, 60 s responses)."
            ),
            part(
              "Referral bundles",
              "Chooses asynchronous inference: requests are queued, payloads up to 1 GB and processing up to one hour are supported, S3 input/output with SNS notification on completion, and the endpoint can scale to zero between bursts; real-time's 60-second limit rules it out.",
              "Asynchronous inference: the 200-600 MB bundles and 10-25 minute processing exceed real-time's 60-second limit but sit inside asynchronous inference's 1 GB payload and one-hour processing allowance. Requests queue, output lands in S3 with an SNS notification, and the endpoint scales down to zero when the burst is over."
            ),
            part(
              "Nightly refresh of 9 million records",
              "Chooses batch transform (no persistent endpoint; reads a dataset from S3, splits it across instances, writes results to S3; processing can run for hours) scheduled by a pipeline so results are ready by 06:00.",
              "Batch transform: the whole 9-million-row dataset is in S3 upfront, no endpoint is needed, and the job can run across several instances for as long as it takes, writing scores back to S3 for the table load. Schedule it with SageMaker Pipelines or EventBridge so it finishes before 06:00."
            ),
            part(
              "Research model",
              "Chooses serverless inference (pay per use, no idle cost, intermittent traffic) and checks the limits fit: payloads up to 4 MB and responses within 60 seconds, so the 1 MB inputs are fine; notes cold-start latency is acceptable here.",
              "Serverless inference: a few dozen unpredictable calls a day means paying for an idle instance would dominate the cost; serverless bills per invocation. The 1 MB inputs fit under the 4 MB payload limit and responses must finish within 60 seconds, which they do. Occasional cold-start delay is acceptable for an internal research tool (provisioned concurrency can remove it if not)."
            ),
          ],
        },
      ],
    },
    {
      slug: "safe-model-rollout-guardrails",
      objective: "Automated deployment strategies and rollback actions",
      kind: "build",
      title: "Roll out a new model version without a bad-model incident",
      brief:
        "Pemberton Logistics serves an ETA-prediction model on a SageMaker real-time endpoint with 6 instances. A previous update replaced the model all at once and a preprocessing mismatch sent wrong ETAs to every customer for 40 minutes. The team wants: new versions proven on a small slice of live traffic first; automatic reversal if error rate or latency worsens; no capacity dip during the switch; and the whole thing driven by the CI/CD pipeline from the Model Registry, with no console clicks. Write the deployment design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the rollout design.",
          parts: [
            part(
              "Deployment strategy",
              "Uses SageMaker deployment guardrails with a blue/green deployment and canary traffic shifting (a small share of traffic to the green fleet for a baking period, then the rest), or linear shifting in steps; explains all-at-once blue/green would repeat the previous incident's blast radius.",
              "UpdateEndpoint with a DeploymentConfig: BlueGreenUpdatePolicy, TrafficRoutingConfiguration Type CANARY with CanarySize 1 instance (or a percentage) and a WaitIntervalInSeconds baking period of, say, 600 seconds before the remaining traffic shifts. Linear (10% steps every few minutes) is the alternative. All-at-once would move 100% of traffic in one step, which is how the last incident happened."
            ),
            part(
              "Automatic rollback",
              "Configures AutoRollbackConfiguration with CloudWatch alarms on the endpoint/variant metrics (Invocation4XXErrors/5XXErrors, ModelLatency p99, and a custom data-quality or prediction-drift metric) so an alarm during the baking period reverts traffic to the blue fleet.",
              "AutoRollbackConfiguration listing alarms on the green variant's Invocation5XXErrors and ModelLatency p99, plus a custom CloudWatch metric emitted by the application comparing predicted ETAs against a sanity range. If any alarm goes to ALARM during the baking period, SageMaker shifts all traffic back to the blue fleet and leaves the endpoint unchanged."
            ),
            part(
              "Capacity and alternatives",
              "Notes that blue/green provisions a full green fleet alongside blue (no capacity dip, temporary double cost), and that a rolling deployment (batch size of instances replaced at a time, with the same alarms and baking period) is the lower-cost alternative when a doubled fleet is not acceptable; guardrails apply to real-time and asynchronous endpoints.",
              "Blue/green brings up a full green fleet of 6 before shifting, so capacity never drops but the fleet is doubled for the duration. If that cost is unacceptable, use a rolling deployment with a batch size of 1-2 instances per step, the same alarms and baking period -- less spare capacity, lower cost. Both are deployment guardrails features of real-time and asynchronous endpoints."
            ),
            part(
              "Pipeline integration",
              "Drives it from CI/CD: a Model Registry approval (model package status Approved) triggers the pipeline (EventBridge event), which creates the endpoint config from the registered model package and calls UpdateEndpoint with the deployment config via the SDK/CLI/CloudFormation, with the pipeline watching the deployment's EventBridge state changes and recording the outcome.",
              "An EventBridge rule on 'SageMaker Model Package State Change' to Approved starts the pipeline. A CodeBuild step creates a new EndpointConfig from the approved model package and calls update-endpoint with the deployment configuration (or updates a CloudFormation stack with the DeploymentConfig). The pipeline waits on the endpoint status and the deployment state-change events and writes the result back to the model package as a note, so there are no console steps."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 4: Operating, Monitoring, and Securing ML and AI Solutions (2)
    // ----------------------------------------------------------------------
    {
      slug: "drift-detection-case",
      objective: "Detecting changes in data distribution that degrade model performance",
      kind: "case",
      title: "Catch a model that is quietly going wrong",
      brief:
        "Ravenscar Credit's loan-default model has run on a SageMaker real-time endpoint for eight months with no monitoring beyond uptime. The risk team says approvals 'feel off' this quarter. You are asked to find out whether the model has degraded and to stop this happening silently again.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Data capture on the endpoint is off. Nobody has the training data statistics to hand. Default labels for recent loans only become known 90 days after a decision.",
          ask: "What do you set up first to see whether the inputs have changed, and what does it compare against?",
          parts: [
            part(
              "Capture and baseline",
              "Enables data capture on the endpoint (request and response to S3), then runs a SageMaker Model Monitor baseline job over the training dataset to produce statistics and constraints (per-feature distributions, types, completeness), explaining the baseline is the reference for drift.",
              "Turn on DataCaptureConfig for the endpoint so inputs and predictions are written to S3. Run a Model Monitor baselining job on the training set to generate statistics.json and constraints.json -- the per-feature distributions, data types and completeness the model was trained on. That baseline is what live traffic gets compared to."
            ),
            part(
              "Data quality monitoring",
              "Schedules a Model Monitor data quality monitoring schedule (for example hourly or daily) that compares captured inputs against the baseline and reports violations (distribution drift, missing values, type mismatches) to S3 and CloudWatch metrics, with an alarm; notes that this detects input drift without needing labels.",
              "Create a data-quality monitoring schedule (daily) that runs the comparison against the baseline and emits violations and CloudWatch metrics per feature. Alarm on the violation count. This needs no labels, so it can tell within a day whether applicant income, debt ratios or any other feature have shifted from the training distribution."
            ),
          ],
        },
        {
          text: "The first week of reports shows the applicant-income feature's distribution has shifted (median up 30%) and a new value appears in the employment-type field that the training data never contained. Prediction scores have moved lower overall.",
          ask: "What does this tell you, and what do you do about the model?",
          parts: [
            part(
              "Interpretation",
              "Distinguishes data (covariate) drift -- inputs differ from training -- from concept drift, and flags the unseen category as a preprocessing/encoding risk (unknown category may be mapped to a default) that can distort predictions regardless of model quality.",
              "This is input drift: applicants now look different from the training population (higher incomes) and employment-type has a category the encoder never saw, which the preprocessing is probably mapping to a default bucket -- a silent distortion. Whether the model's relationship between features and default has also changed (concept drift) cannot be known yet without labels."
            ),
            part(
              "Action",
              "Investigates the upstream change (new product or market, a schema change), fixes the encoding for the new category, and triggers retraining on recent data via the pipeline once enough labeled examples exist; meanwhile applies a human-review threshold band and a model-quality monitor once labels arrive.",
              "Find the upstream cause (a new channel or product explains both shifts), fix the encoder to handle the new employment type explicitly, and queue a retraining run on recent data through the pipeline. Until the retrained model is validated, route borderline scores to manual review. Set up a model-quality monitor that merges captured predictions with the 90-day-later labels so accuracy/AUC on real outcomes is tracked too."
            ),
          ],
        },
        {
          text: "Compliance now asks whether the model has started treating any group unfairly since deployment, and whether the features driving decisions have changed.",
          ask: "Which monitors answer those questions, and what triggers an alert?",
          parts: [
            part(
              "Bias and explainability monitoring",
              "Adds SageMaker Clarify-based monitors: bias drift monitoring (post-training bias metrics on captured data and labels, per facet such as age band) and feature attribution drift (SHAP-based attribution distribution compared with the baseline), each on a schedule with CloudWatch alarms when metrics cross thresholds; feeds alerts to the retraining decision.",
              "A bias drift monitoring schedule computes Clarify bias metrics on live predictions (and labels as they arrive) per facet -- for example difference in acceptance rates by age band -- and alarms when a metric leaves the allowed range. A feature attribution drift schedule compares the SHAP attribution ranking of live traffic with the baseline and alarms when the top drivers change. Both alarms go to the same SNS topic that opens a review and can start the retraining pipeline."
            ),
          ],
        },
      ],
    },
    {
      slug: "bedrock-guardrails-configuration",
      objective: "Implementing safeguards and sensitive data protection with Amazon Bedrock Guardrails",
      kind: "build",
      title: "Configure guardrails for a bank's customer chatbot",
      brief:
        "Fairholme Bank is launching a Bedrock-based chatbot that answers questions about its products using a knowledge base. Rules from compliance: the bot must not give personal investment advice or discuss competitor products; it must never repeat a customer's card number or national ID back, though it may acknowledge that an account number was given; it must refuse to continue when a user attempts a prompt injection; answers must be grounded in the retrieved documents, not invented; and the same protections must apply if a developer calls a different model later. Write the guardrail configuration.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Amazon Bedrock Guardrails configuration.",
          parts: [
            part(
              "Topics and words",
              "Defines denied topics with a definition and sample phrases for 'personal investment advice' and 'competitor products', and a word filter listing competitor names (plus the managed profanity list), with a custom blocked-message response.",
              "Denied topic 'Investment advice': definition 'recommendations about which securities, funds or strategies a specific customer should buy, sell or hold', with sample phrases; denied topic 'Competitors' likewise. Word filter: the competitor brand names and the managed profanity list. Blocked message: 'I can't help with that, but I can explain Fairholme's products or connect you with an adviser.'"
            ),
            part(
              "Sensitive information",
              "Configures sensitive information filters: PII types such as credit/debit card number and national identification number set to BLOCK (or MASK on the output so they are never echoed), bank account number set to MASK rather than block so the conversation can continue; adds a regex for the bank's internal account format; applies to both input and output.",
              "Sensitive information filters: CREDIT_DEBIT_CARD_NUMBER and national ID types -> block (the bot should never process them at all); bank account number -> mask, so the model sees and replies with {ACCOUNT_NUMBER} and the conversation continues without echoing the digits. Add a regex entity for Fairholme's internal account format with mask behavior. Filters apply to user inputs and model responses."
            ),
            part(
              "Prompt attacks and grounding",
              "Enables the content filters including the Prompt Attack category at high strength on inputs (and the harmful-content categories at appropriate strengths), and turns on contextual grounding checks with grounding and relevance thresholds so a response not supported by the retrieved knowledge-base passages, or not relevant to the question, is blocked.",
              "Content filters: Prompt Attack at HIGH strength on the input side so jailbreak and injection attempts are blocked, with Hate/Insults/Sexual/Violence/Misconduct at the bank's chosen strengths. Contextual grounding check enabled with a grounding threshold (for example 0.75) and a relevance threshold so answers that are not supported by the retrieved passages, or that wander off the question, are blocked instead of returned. Tag only the user turn for evaluation in RAG calls so the retrieved documents are not misread as attacks."
            ),
            part(
              "Applying it everywhere",
              "Attaches the guardrail (id and version) to the knowledge-base RetrieveAndGenerate / Converse calls and to the agent, and uses the ApplyGuardrail API for any path that does not invoke a Bedrock model (or a different model later), so the protections are independent of the model; versions the guardrail and tests it with a red-team set before release, and keeps IAM such that applications can only use the approved guardrail version.",
              "Pass the guardrail id and a published version in every RetrieveAndGenerate / Converse call and in the agent configuration. For any component that calls a model elsewhere or post-processes text, call ApplyGuardrail directly on the input and output -- the same policies, no model dependency. Publish numbered versions, run a red-team test set (injections, card numbers, advice requests) against each version in the Guardrails test tool, and restrict bedrock:InvokeModel in IAM with the guardrail condition so apps cannot skip it."
            ),
          ],
        },
      ],
    },
  ],
};
