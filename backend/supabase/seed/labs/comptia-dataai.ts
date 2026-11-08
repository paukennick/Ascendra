import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-160: CompTIA DataAI (DY0-001, V1; the exam formerly branded DataX).
//
// Verified 2026-11-07 against CompTIA's DataAI certification page: exam
// series code DY0-001, version V1, launched 2024-07-25, maximum 90 questions
// (multiple-choice and performance-based), 165 minutes, pass/fail only,
// retirement estimated 2027 with no successor announced; five domains
// Mathematics and Statistics 17%, Modeling, Analysis, and Outcomes 24%,
// Machine Learning 24%, Operations and Processes 22%, Specialized
// Applications of Data Science 13% -- the weights the seed track carries.
//   https://www.comptia.org/en-us/certifications/dataai/
// Density (docs/labs.md, policy "hybrid"): 1 / 3 / 1 / 1 / 2. The labs ask
// for the data scientist's working: confusion-matrix metrics (including MCC)
// from counts, a model recommendation against stated requirements, remedies
// for named data problems, an audience-specific results brief, an
// overfitting-then-imbalance-then-drift case, a SQL merge with winsorisation,
// TF-IDF by hand on a three-document corpus (convention stated in the
// brief), and optimisation framing with a bandit allocation. Every figure
// was computed from the brief's numbers; conventions (natural-log IDF, raw
// term frequency, sample statistics) are stated so an equally valid
// convention can be graded fairly.

export const DATAAI_LABS: SeedLabSet = {
  trackCode: "DATAAI",
  sources: ["https://www.comptia.org/en-us/certifications/dataai/"],
  labs: [
    // -----------------------------------------------------------------------
    // Mathematics and Statistics (17%) -- 1 lab
    // -----------------------------------------------------------------------
    {
      slug: "confusion-matrix-metrics-fraud-model",
      objective:
        "Statistical methods and concepts: t-tests, chi-squared tests, ANOVA, hypothesis testing, regression performance metrics (R2, RMSE), and confusion-matrix metrics (precision, recall, F1, MCC)",
      kind: "build",
      title: "Evaluate a fraud model from its confusion matrix",
      brief:
        "Kestrel Pay's fraud-detection model was scored on 10,000 held-out transactions, of which 100 were truly fraudulent. Results: 80 frauds correctly flagged (true positives), 20 frauds missed (false negatives), 120 legitimate transactions wrongly flagged (false positives), and 9,780 legitimate transactions correctly passed (true negatives). The operations team can manually review at most 250 flagged transactions a day. The product manager says 'the model is 98.6% accurate, ship it'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compute precision, recall, F1, specificity, accuracy and MCC; interpret them for this problem; respond to the product manager; and say which metric you would optimise and how a threshold change trades off.",
          parts: [
            part(
              "Precision, recall and F1",
              "Precision = 80 / (80 + 120) = 0.40; recall (sensitivity) = 80 / (80 + 20) = 0.80; F1 = 2 x 0.40 x 0.80 / (0.40 + 0.80) = 0.64 / 1.20 = 0.533.",
              "Precision = TP / (TP + FP) = 80 / 200 = 0.40: of every ten transactions flagged, four are fraud. Recall = TP / (TP + FN) = 80 / 100 = 0.80: the model catches 80% of actual fraud. F1 = 2PR / (P + R) = 2 x 0.40 x 0.80 / 1.20 = 0.533."
            ),
            part(
              "Specificity, accuracy and MCC",
              "Specificity = 9,780 / (9,780 + 120) = 0.988; accuracy = (80 + 9,780) / 10,000 = 0.986; MCC = (80 x 9,780 - 120 x 20) / sqrt(200 x 100 x 9,900 x 9,800) = 780,000 / 1,392,982 = 0.56.",
              "Specificity = TN / (TN + FP) = 9,780 / 9,900 = 0.988. Accuracy = (TP + TN) / N = 9,860 / 10,000 = 0.986. MCC = (TP x TN - FP x FN) / sqrt((TP + FP)(TP + FN)(TN + FP)(TN + FN)) = (782,400 - 2,400) / sqrt(200 x 100 x 9,900 x 9,800) = 780,000 / sqrt(1.9404 x 10^12) = 780,000 / 1,392,982 = 0.56. MCC runs from -1 to 1 and uses all four cells, so 0.56 says 'moderately good', unlike the flattering 0.986."
            ),
            part(
              "Responding to 'it's 98.6% accurate'",
              "Explains accuracy is misleading under a 1% base rate: a model that flags nothing scores 99.0% accuracy (9,900 / 10,000) and catches no fraud; the informative metrics are recall (0.80), precision (0.40) and MCC (0.56), plus the business cost of each error type.",
              "Flagging nothing at all would be 99.0% accurate (9,900 correct of 10,000) and catch zero fraud, so 98.6% accuracy is worse than doing nothing by that measure -- accuracy is the wrong lens when 1% of cases are positive. The real picture: the model finds 80% of fraud (recall) at the cost of 120 false alarms, with 40% precision, and an MCC of 0.56. Whether that is good depends on what a missed fraud costs versus a wrongly held payment."
            ),
            part(
              "What to optimise and the threshold trade-off",
              "Chooses to maximise recall subject to the review capacity: 200 flags per day fit within the 250-review budget, so the threshold can be lowered to flag up to 250 (raising recall, lowering precision) until the budget is hit; explains lowering the threshold trades precision for recall and would use a precision-recall curve (not ROC, given imbalance) to pick the point; mentions cost-weighted evaluation.",
              "With a hard review budget of 250 a day and 200 currently flagged, lower the decision threshold until about 250 are flagged: recall rises (more of the 20 missed frauds get caught) while precision falls, which the business accepts because reviewers absorb the extra false alarms. Pick the point on the precision-recall curve (the right curve for a 1% positive rate; ROC would look deceptively good) where flags hit the capacity, and weight the choice by the cost of a missed fraud versus a reviewed legitimate payment. Report recall, precision at the chosen threshold and MCC -- not accuracy -- in the model card."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Modeling, Analysis, and Outcomes (24%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "justify-model-recommendation-from-results",
      objective:
        "Analyzing experiment and testing results to justify a final model recommendation: performance evaluation, diagnostic plots, benchmarking, and requirements validation",
      kind: "build",
      title: "Recommend a model from the experiment table against the requirements",
      brief:
        "Rowan Health's readmission-risk project has three candidate models evaluated on the same time-based holdout (patients discharged after the training cutoff). Requirements from the clinical team: recall for high-risk patients at least 0.90; scoring latency at most 20 ms at the 95th percentile because it runs inside the discharge workflow; clinicians must be able to see why a patient was flagged; the current rules-based system has recall 0.70 and precision 0.30.\n\nResults:\nLogistic regression -- recall 0.82, precision 0.45, PR-AUC 0.52, p95 latency 3 ms, directly interpretable coefficients.\nGradient-boosted trees -- recall 0.91, precision 0.52, PR-AUC 0.61, p95 latency 12 ms, explainable with feature attributions.\nDeep neural network -- recall 0.92, precision 0.50, PR-AUC 0.60, p95 latency 85 ms (needs a GPU), explanations approximate.\n\nThe neural network's author argues it has the highest recall and should win.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Validate each model against the requirements, benchmark against the current system, name the diagnostic checks you want before sign-off, and write the recommendation with its caveats.",
          parts: [
            part(
              "Requirements validation",
              "Checks each model against all three requirements: logistic regression fails recall (0.82 < 0.90); the neural network meets recall but fails latency (85 ms > 20 ms) and is weakest on explainability; gradient-boosted trees meet recall (0.91), latency (12 ms) and explainability -- the only candidate that passes everything.",
              "Logistic regression: recall 0.82 misses the 0.90 floor, so it is out despite being fastest and most interpretable. Neural network: recall 0.92 passes, but 85 ms at p95 is more than four times the 20 ms budget inside the discharge workflow, and it needs a GPU and offers only approximate explanations -- two failures. Gradient-boosted trees: recall 0.91 (pass), 12 ms (pass), per-prediction feature attributions clinicians can read (pass). Only one model satisfies the requirements; 'highest recall' is not the requirement, 'recall at least 0.90 within the other constraints' is."
            ),
            part(
              "Benchmarking against the current system",
              "Compares the boosted trees with the rules baseline: recall 0.91 vs 0.70 (catches about 30% more of the high-risk patients) and precision 0.52 vs 0.30 (about 42% fewer false flags per true flag... or stated as fewer unnecessary interventions), and notes the gain should be expressed in patients and clinician time, not only ratios.",
              "Against the rules system (recall 0.70, precision 0.30), the boosted trees raise recall to 0.91 -- for every 100 patients who will be readmitted, 91 are flagged instead of 70 -- and lift precision from 0.30 to 0.52, so roughly half of flags are true high-risk cases instead of under a third, meaning fewer wasted follow-up calls. Translate it for the clinical lead: per 1,000 discharges at the hospital's readmission rate, how many additional at-risk patients get intervention and how many fewer false flags the nurses work."
            ),
            part(
              "Diagnostic checks before sign-off",
              "Asks for: a calibration plot (predicted vs observed risk by decile) since clinicians read scores as probabilities; the precision-recall curve to confirm 0.90 recall is reachable at a stable threshold; performance by subgroup (age, sex, insurance, site) for fairness and stability; feature-attribution review for leakage (e.g. a feature only known after readmission); the time-based split confirmed and no overlap with training; confidence intervals or bootstrap on the holdout metrics.",
              "Before signing: 1) calibration curve -- a 0.3 score must mean roughly 30% of such patients are readmitted, or the threshold is meaningless; 2) the full precision-recall curve, to see how sharply precision falls at the threshold that gives 0.90 recall and whether a small data shift pushes recall under 0.90; 3) metrics broken out by age band, sex, payer and hospital site, to catch a subgroup where the model underperforms; 4) inspect the top features for leakage, such as a 'discharge follow-up scheduled' flag recorded after the fact; 5) confirm the holdout is strictly after the training period with no patient overlap; 6) bootstrap confidence intervals on recall and precision, since a holdout of a few thousand discharges leaves real uncertainty."
            ),
            part(
              "Recommendation and caveats",
              "Recommends the gradient-boosted model, conditional on the diagnostics passing, with the chosen threshold, a plan to monitor recall and calibration after deployment (drift), the rules system kept as fallback during a shadow period, and the explicit statement that the neural network was rejected on latency and explainability, not accuracy.",
              "Recommend the gradient-boosted trees at the threshold that yields 0.91 recall, conditional on calibration and subgroup checks passing. Deploy in shadow mode beside the rules system for a month, comparing flags, then switch; keep the rules as fallback. Monitor recall, precision and calibration monthly against newly observed readmissions and retrain on drift. Record that the neural network was declined for failing the 20 ms latency requirement and the explainability need, not for lack of recall, so the decision can be revisited if the workflow changes."
            ),
          ],
        },
      ],
    },
    {
      slug: "diagnose-and-remediate-data-issues",
      objective:
        "Analyzing common data issues: sparse data, non-linearity, non-stationarity, seasonality, and remediation via one-hot encoding, scaling, geocoding, or synthetic data",
      kind: "build",
      title: "Diagnose the data problems in a demand-forecasting feature set",
      brief:
        "Harrowgate Grocers wants to predict daily sales per store. The feature set, as handed over: store_city (text, 400 distinct cities); household_income (right-skewed, from 12,000 to 2,400,000 with a long upper tail); daily_sales target (rising trend over three years with a strong weekly cycle and December peaks); store_address (free text); promotion_type (12 categories, 9 of which appear in under 1% of rows); customer_age vs spend (spend rises to about age 55 then falls); and three numeric features on very different scales (0-1, 0-100, 0-1,000,000). The first attempt, a linear regression on the raw features, performs poorly and its residuals show a weekly pattern.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each feature or symptom, name the data issue and the remediation, then say how you would check the remediation worked.",
          parts: [
            part(
              "Categorical and sparse features",
              "store_city with 400 levels: one-hot encoding creates 400 sparse columns -- use target/frequency encoding, grouping into regions, or embeddings, or geocode to latitude/longitude; promotion_type with 9 rare levels: sparse categories -- collapse rare levels into 'other' (or use regularised target encoding) before one-hot encoding the remaining few.",
              "store_city: one-hot encoding 400 cities gives a huge, sparse matrix most models handle badly; instead geocode the city to latitude/longitude (continuous, two columns) or group cities into regions, or use frequency/target encoding with cross-fold regularisation. promotion_type: nine of twelve levels are so rare that their one-hot columns are almost all zeros -- merge them into 'other_promo' and one-hot encode the resulting four levels, which keeps the information that mattered without sparse noise."
            ),
            part(
              "Skew, scale and the address",
              "household_income: heavy right skew -- apply a log (or Box-Cox) transform, and consider winsorising extreme values; the three differently scaled features: standardise or min-max scale so regularised/distance-based models do not let the 0-1,000,000 feature dominate; store_address: free text is useless as-is -- geocode to coordinates (and derive distance to competitors or city centre), or drop in favour of store_city coordinates.",
              "household_income: log-transform it (log1p) so the 2.4 million tail stops dominating the fit; check skewness drops toward zero and winsorise the top 0.5% if a few values remain extreme. Scaling: standardise (z-score) or min-max scale the three numeric features; for linear models with regularisation and for anything distance-based (k-NN, k-means, SVM) the 0-1,000,000 column would otherwise swamp the 0-1 one. Tree models do not need it, but it costs nothing. store_address: geocode it to latitude/longitude and derive useful numeric features (distance to nearest competitor, urban/rural); raw text strings carry nothing a model can use."
            ),
            part(
              "Non-linearity, trend and seasonality",
              "customer_age vs spend is non-linear (rises then falls): add polynomial or spline terms, bin age, or use a tree-based/boosted model; daily_sales has a trend (non-stationary) and weekly and yearly seasonality: add day-of-week and month/holiday features, model the trend (detrend/difference or include a time index), or use a seasonal time-series model; the weekly residual pattern shows the linear model is missing day-of-week.",
              "Age-spend: a straight line cannot fit a hump; add age and age-squared (or a spline), or switch to gradient-boosted trees which learn the curve. daily_sales: three years of rising trend means the series is non-stationary -- include a time index or difference the series -- and the weekly cycle plus December peak are seasonality: add day-of-week dummies, month or week-of-year, and a holiday flag (or fit a seasonal model such as SARIMA/Prophet-style decomposition). The weekly pattern in the residuals is exactly the signature of missing day-of-week features."
            ),
            part(
              "Checking the fixes",
              "Re-check distributions (skewness near zero after the log), residual plots with no weekly or trend structure (and autocorrelation of residuals near zero), cross-validated error with a time-based split, feature importances to confirm the new features are used, and watch for leakage from encodings fitted on the full data; considers synthetic data only for genuinely missing segments (new stores) and labels it.",
              "After remediation: histogram of log income is roughly symmetric; residual plot against time shows no weekly waves and the residual autocorrelation at lag 7 is near zero; RMSE on a time-ordered validation split (train on years 1-2, validate on year 3) improves, not just in-sample fit; feature importance shows day-of-week and the geocoded features being used; and the target/frequency encodings were fitted inside each cross-validation fold so no validation target leaked. Synthetic rows are a last resort -- for example to represent a new store with no history -- and are flagged as synthetic in the dataset."
            ),
          ],
        },
      ],
    },
    {
      slug: "results-for-three-audiences-no-deception",
      objective:
        "Translating and communicating results: choosing visualizations and reports for executive, domain, and peer audiences while avoiding deceptive charting and ensuring accessibility",
      kind: "build",
      title: "Present a churn model's results to executives, operators and peers",
      brief:
        "You built a customer-churn model for Lindenwood Telecom. On the holdout: recall 0.74, precision 0.61, PR-AUC 0.68 versus 0.21 for random; the top drivers are contract type, number of support calls in the last 90 days, and price increases. A retention offer sent to the top 10% risk scores in a pilot reduced churn in that group from 18% to 14%. Three audiences: the executive committee (fund the retention programme?), the retention operations team (who to call and why), and the data-science peer review. A draft slide shows a bar chart of churn 18% vs 14% with the y-axis running from 13% to 19%, in red and green.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the communication for each audience, fix the draft chart, and set the accessibility rules.",
          parts: [
            part(
              "Executive committee",
              "Leads with the business outcome and decision (churn in the targeted group cut from 18% to 14%, a 4-point / 22% relative reduction; expected customers retained and revenue protected vs programme cost), one honest chart, the confidence/limits of the pilot, and the ask; omits PR-AUC and model internals except in an appendix.",
              "One slide: 'Targeting the top 10% risk cut churn from 18% to 14% in the pilot -- about 4 in 100 targeted customers kept, worth $X a year against $Y in offers. Recommendation: fund the programme for all regions.' Show the two bars on a zero-based axis with the difference labelled, state the pilot size and that it ran in two regions over one quarter, and list the next decision. PR-AUC, recall and feature attributions live in the appendix for anyone who asks."
            ),
            part(
              "Retention operations",
              "Delivers a ranked call list with each customer's risk score and the top reasons in plain language (e.g. 'three support calls last month; contract ends in 30 days'), the offer to make, and a weekly refresh; a simple dashboard of calls made and outcomes; avoids statistics they cannot act on.",
              "A weekly ranked list in their CRM: customer, risk score as a plain band (high/medium), the two or three drivers written as reasons ('out-of-contract since March; 3 support calls in 90 days; price rose 8% in June'), and the recommended offer. A small dashboard tracks calls made, offers accepted and 60-day churn of contacted vs. not-yet-contacted customers so the team sees its effect. No AUC, no coefficients -- reasons and names."
            ),
            part(
              "Peer review",
              "Provides full methodology: data window and leakage checks, time-based split, class balance, the precision-recall curve with the random baseline (0.21), calibration plot, threshold choice for the top-10% cut, feature attributions and their stability, pilot design and its limits (not randomised? selection effects), code and seeds for reproducibility.",
              "A notebook and write-up: feature definitions and the 90-day windows with a leakage audit; time-based train/validation/holdout; prevalence (21%) and how imbalance was handled; the precision-recall curve against the 0.21 random baseline and why PR-AUC rather than ROC-AUC; calibration by decile; how the top-10% threshold maps to recall 0.74 / precision 0.61; SHAP-style attributions with stability across folds; the pilot's design -- whether the comparison group was randomly held out or merely untreated, and what that does to the 18% vs 14% claim; environment, seeds and code to rerun everything."
            ),
            part(
              "Fixing the chart and accessibility",
              "Starts the bar chart's axis at 0% (the truncated 13-19% axis makes a 4-point change look like a collapse), labels values directly, uses a colour-blind-safe palette rather than red/green (or adds pattern/labels so colour is not the only cue), adds alt text and sufficient contrast, readable font sizes, and states the sample size and period on the chart.",
              "Redraw with the y-axis from 0% to 20%: the bars then show an honest 18% vs 14%, still clearly different, instead of a cliff. Label each bar with its value and the difference. Drop red/green -- about 8% of men cannot tell them apart -- for a colour-blind-safe pair (e.g. blue/orange) and put the labels on the bars so colour is never the only signal. Add a text alternative ('Churn fell from 18% to 14% among targeted customers, pilot of 12,000 customers, Q2'), 4.5:1 contrast for text, fonts large enough for a projector, and the sample size and period in the subtitle."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Machine Learning (24%) -- 1 lab
    // -----------------------------------------------------------------------
    {
      slug: "overfit-imbalance-drift-case",
      objective:
        "Foundational machine-learning concepts: loss functions, the bias-variance tradeoff, class-imbalance mitigations (SMOTE, oversampling), regularization, cross-validation, ensemble models, and model drift",
      kind: "case",
      title: "Take a defect-prediction model from overfitting to production drift",
      brief:
        "Bramblewood Manufacturing is building a classifier that predicts whether a produced part will fail quality inspection, from 60 sensor features. About 3% of parts fail. You are reviewing the data scientist's work over three checkpoints.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Checkpoint 1. A deep gradient-boosted model with 2,000 trees of depth 12, trained on all available history, reports: training accuracy 99.8%, training log-loss 0.01; validation accuracy 96.2%, validation log-loss 0.31. The data scientist proposes adding more features to close the gap.",
          ask: "Diagnose what is happening in bias-variance terms and say what you would change instead.",
          parts: [
            part(
              "Diagnosis",
              "Identifies high variance / overfitting: near-perfect training performance with a large gap to validation (log-loss 0.01 vs 0.31) means the model memorises the training set; adding features would make it worse, not better; also flags that 96.2% validation accuracy is below the 97% that always-predict-pass would achieve.",
              "The model has learned the training data, not the process: training log-loss 0.01 against validation 0.31 is a classic high-variance gap, driven by 2,000 very deep trees. More features add capacity and will widen the gap. And note the second problem hiding in plain sight: with 3% defects, a model that predicts 'pass' for everything is 97% accurate, so 96.2% validation accuracy is worse than doing nothing -- accuracy is not telling us anything useful here."
            ),
            part(
              "Remedies",
              "Reduces variance with regularisation and simpler structure: shallower trees (depth 3-6), fewer trees with early stopping on a validation set, learning-rate shrinkage, subsampling of rows/features, L1/L2 penalties on leaves; selects hyperparameters by k-fold cross-validation (stratified, grouped by production batch) rather than one split; more data helps if available.",
              "Constrain the model: max depth 4-6, learning rate 0.05 with early stopping when validation log-loss stops improving (likely a few hundred trees, not 2,000), row and column subsampling, and L2 regularisation on leaf weights. Choose those settings by stratified k-fold cross-validation, grouping folds by production batch so a batch never spans train and validation. Keep the holdout untouched for the final number. More training data from other lines helps variance too; more features do not."
            ),
          ],
        },
        {
          text:
            "Checkpoint 2. After regularisation the validation log-loss is 0.09 and the validation accuracy 97.4%. The confusion matrix on 20,000 validation parts (600 defective): true positives 180, false negatives 420, false positives 100, true negatives 19,300. The plant manager wants at least 80% of defects caught before shipping.",
          ask: "Evaluate this honestly and fix the class-imbalance problem the right way.",
          parts: [
            part(
              "Evaluation",
              "Computes recall = 180 / 600 = 0.30 and precision = 180 / 280 = 0.64: the model misses 70% of defects, far from the 80% target, even though accuracy (19,480 / 20,000 = 97.4%) looks fine; states that accuracy is dominated by the majority class and recall/precision, PR-AUC or F-beta are the right lenses.",
              "Recall = 180 / (180 + 420) = 0.30: seven in ten defective parts ship. Precision = 180 / (180 + 100) = 0.64. Accuracy 97.4% (19,480 / 20,000) is almost entirely the 19,300 easy negatives. Against the manager's 80% recall target the model fails badly; the metric to track is recall at an acceptable false-positive rate (PR-AUC or F2, which weights recall over precision), never accuracy."
            ),
            part(
              "Imbalance mitigations",
              "Lowers the decision threshold (the cheapest lever) to trade precision for recall; uses class weights (scale_pos_weight / cost-sensitive loss) so the loss penalises missed defects more; resampling -- oversampling or SMOTE applied only inside the training folds, never to validation or test -- or undersampling the majority; evaluates with PR curves; considers an ensemble; warns that SMOTE on the full data before splitting leaks and inflates validation scores.",
              "First move the threshold: the model outputs probabilities, and the default 0.5 cut is arbitrary -- pick the threshold on the validation precision-recall curve where recall reaches 0.80 and see what precision costs. Then retrain with the loss weighted toward the minority class (class weights or scale_pos_weight around 32, the negative-to-positive ratio) so missed defects hurt more during training. If still short, oversample defects or generate SMOTE examples inside each training fold only -- resampling the validation or test set, or the whole dataset before splitting, leaks synthetic neighbours across the split and produces scores that collapse in production. Undersampling the 97% can also work and speeds training. Report recall, precision and PR-AUC at the chosen threshold."
            ),
          ],
        },
        {
          text:
            "Checkpoint 3. The model went live six months ago at a threshold giving recall 0.82 and precision 0.55 on the holdout. Monitoring now shows, over the last month: recall 0.61 (measured on parts later inspected), precision 0.38, and the distribution of three sensor features has shifted noticeably since a supplier change for a raw material in week 18.",
          ask: "Name what has happened, how you would detect it earlier, and what you do about it.",
          parts: [
            part(
              "Naming the problem",
              "Identifies model drift -- specifically data (covariate) drift in the sensor features after the supplier change, likely with concept drift (the relationship between sensors and defects changed), producing performance decay from recall 0.82 to 0.61.",
              "This is model drift. The inputs moved (covariate drift: three sensor features have a new distribution since the week-18 supplier change) and the mapping from sensors to 'defective' probably moved with them (concept drift), so a model fitted to the old process now misses 39% of defects instead of 18%. The timing lines up with a known process change, which is the usual cause."
            ),
            part(
              "Detection and response",
              "Monitors input distributions (PSI/KS tests per feature) and prediction distributions continuously, plus delayed-label performance (recall, precision) with alert thresholds; links alerts to process-change events; responds by retraining on recent data (including post-change parts), re-validating with a time-based split, re-choosing the threshold, and deploying via shadow/champion-challenger; schedules periodic retraining and documents the incident.",
              "Earlier detection: compute a population-stability index or KS statistic per feature daily against the training distribution and alert when a feature shifts -- that would have fired in week 18, months before enough inspected parts revealed the recall drop. Also track the score distribution (share of parts above threshold) and the delayed-label metrics with an alert at, say, recall below 0.75. Response: retrain on data that includes the post-change weeks (possibly weighting recent data), validate on a time-based split after week 18, re-select the threshold for 0.80 recall, run the challenger beside the champion for two weeks, then promote. Put retraining on a schedule or a drift trigger, and add 'supplier or process change' to the events that trigger a model review."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Operations and Processes (22%) -- 1 lab
    // -----------------------------------------------------------------------
    {
      slug: "merge-standardise-winsorise-sql",
      objective: "Data-wrangling techniques: merging and combining datasets, date/time standardization, and winsorization",
      kind: "build",
      title: "Merge three sources, standardise their timestamps and winsorise amounts in SQL",
      brief:
        "Juniper Marketplace needs one analysis table from three sources. orders (1,200 rows for the week): order_id, customer_id, order_ts as ISO-8601 UTC text like '2026-11-03T14:05:00Z', amount. customers (1,150 of the ordering customers exist; 50 orders belong to guest checkouts with no customer row): customer_id, signup_date as text in day/month/year form like '03/11/2026', region. web_events: customer_id, event_time as Unix epoch milliseconds (e.g. 1762178700000), event_type. Analysts want: every order kept even without a customer; all times as UTC timestamps; a per-customer last_event_time; and order amounts winsorised at the 5th and 95th percentiles, which for this week are 12.00 and 480.00 (the raw maximum is 12,500.00). Write it in SQL (any mainstream dialect; name it).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the join with the right join type and the row count you expect, the timestamp standardisation for all three sources, the winsorisation, and the checks you run on the result.",
          parts: [
            part(
              "Join type and expected rows",
              "Uses a LEFT JOIN from orders to customers (keep guest orders; an INNER JOIN would drop the 50 guest orders and return 1,150 rows) and expects exactly 1,200 rows with region NULL for the 50 guests; joins web_events through a pre-aggregated per-customer subquery/CTE (MAX(event_time)) so the one-to-many relationship does not multiply order rows.",
              "FROM orders o LEFT JOIN customers c ON c.customer_id = o.customer_id -- 1,200 rows out, 50 of them with NULL customer fields. An INNER JOIN would silently return 1,150. web_events is many per customer, so aggregate it first (CTE last_evt AS (SELECT customer_id, MAX(event_time) AS last_event_ms FROM web_events GROUP BY customer_id)) and LEFT JOIN that; joining the raw events table would fan each order out to one row per event."
            ),
            part(
              "Timestamp standardisation",
              "Parses order_ts from ISO text to a UTC timestamp (e.g. PostgreSQL: order_ts::timestamptz), signup_date with an explicit day-first format (to_date(signup_date, 'DD/MM/YYYY')) because '03/11/2026' is ambiguous, and event_time from epoch milliseconds by dividing by 1000 (to_timestamp(event_time / 1000.0)); stores everything in UTC with a timezone-aware type.",
              "PostgreSQL:\n  o.order_ts::timestamptz AS order_time_utc,  -- ISO 8601 with Z parses directly as UTC\n  to_date(c.signup_date, 'DD/MM/YYYY') AS signup_date, -- explicit day-first; the default parser might read 03/11 as March 11\n  to_timestamp(e.last_event_ms / 1000.0) AT TIME ZONE 'UTC' AS last_event_time_utc -- epoch is in milliseconds, so divide by 1000\nKeep the session time zone at UTC and store timestamptz, so every downstream comparison (order before or after last web event) is on one clock."
            ),
            part(
              "Winsorisation",
              "Caps amounts into [12.00, 480.00] with GREATEST(LEAST(amount, 480.00), 12.00) (or CASE), so 12,500.00 becomes 480.00 and anything under 12 becomes 12; keeps the raw amount in another column; explains winsorisation keeps the rows but limits the influence of extremes, unlike trimming which drops them; notes the percentiles came from PERCENTILE_CONT(0.05/0.95).",
              "  o.amount AS amount_raw,\n  GREATEST(LEAST(o.amount, 480.00), 12.00) AS amount_winsorized\nThe 12,500.00 order stays in the table but counts as 480.00 in means and models; values below 12.00 rise to 12.00. Winsorising keeps every observation and only limits leverage, where trimming would delete the extreme rows. The bounds were computed on the week's data with PERCENTILE_CONT(0.05) and PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY amount); recompute them per period rather than hard-coding forever."
            ),
            part(
              "Checks on the result",
              "COUNT(*) = 1,200; COUNT(customer_id IS NULL) = 50; MIN/MAX of amount_winsorized are 12.00 and 480.00 with no NULLs introduced; no order_time_utc NULLs from failed parses; spot-check a few signup dates against the source to confirm day-first parsing; last_event_time_utc <= now and plausible; SUM(amount_raw) unchanged from the orders table.",
              "SELECT COUNT(*) -> 1,200; SELECT COUNT(*) WHERE region IS NULL -> 50; SELECT MIN(amount_winsorized), MAX(amount_winsorized) -> 12.00 and 480.00; SELECT COUNT(*) WHERE order_time_utc IS NULL -> 0 (a bad ISO string would fail the cast loudly, which is what we want); compare three customers' signup_date against the source file to prove '03/11/2026' became 3 November; SELECT MAX(last_event_time_utc) is not in the future; SUM(amount_raw) equals SUM(amount) FROM orders, proving the joins neither dropped nor duplicated anything."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Specialized Applications of Data Science (13%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "tfidf-by-hand-support-tickets",
      objective:
        "Natural language processing concepts: tokenization, word embeddings, TF-IDF, topic modeling, and NLP applications (sentiment analysis, NER, text generation)",
      kind: "build",
      title: "Compute TF-IDF by hand and pick the NLP method for each ticket task",
      brief:
        "Alderney Software's support team has 50,000 tickets. To explain the pipeline to a new analyst you use a three-document toy corpus:\nD1: \"Server down again\"\nD2: \"Server slow\"\nD3: \"Password reset again\"\nConventions: lowercase, split on whitespace, no stop-word removal; term frequency = raw count in the document; IDF = ln(N / df) with N = 3 and df = number of documents containing the term; TF-IDF = TF x IDF. The team then wants four things from the real corpus: find the main themes without labelled data; automatically pull product and customer names out of tickets; flag angry tickets; and draft a first reply for agents to edit.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Tokenise the corpus and give the vocabulary with document frequencies, compute the TF-IDF vector for D1 and name its most distinctive term, explain when embeddings beat TF-IDF, and assign an NLP technique to each of the four tasks.",
          parts: [
            part(
              "Tokenisation and document frequency",
              "Vocabulary of six tokens -- server (df 2), down (1), again (2), slow (1), password (1), reset (1) -- from lowercasing and whitespace splitting; notes that stemming/lemmatisation and stop-word removal would be applied on the real corpus.",
              "Tokens after lowercasing and splitting: D1 = [server, down, again]; D2 = [server, slow]; D3 = [password, reset, again]. Vocabulary and df: server 2, again 2, down 1, slow 1, password 1, reset 1. On the real corpus the pipeline would also strip punctuation, remove stop words ('the', 'is'), and lemmatise ('resetting' -> 'reset'), and would probably use sub-word tokenisation if feeding a neural model."
            ),
            part(
              "TF-IDF for D1",
              "IDF: server and again = ln(3/2) = 0.405; down, slow, password, reset = ln(3/1) = 1.099. D1 vector: server 0.405, down 1.099, again 0.405, others 0; 'down' is the most distinctive term because it appears only in D1.",
              "IDF values: ln(3/2) = 0.405 for server and again; ln(3/1) = 1.099 for down, slow, password and reset. D1 has TF 1 for server, down and again, so TF-IDF(D1) = [server 0.405, down 1.099, again 0.405, slow 0, password 0, reset 0]. 'down' carries the highest weight: it is the term D1 shares with no other document, which is exactly what IDF rewards; 'server' and 'again' are discounted because each appears in two of the three documents. (A smoothed IDF such as ln((1+N)/(1+df)) + 1 gives different numbers but the same ranking.)"
            ),
            part(
              "TF-IDF versus embeddings",
              "Explains TF-IDF vectors are sparse and treat 'down' and 'slow' as unrelated, so D1 and D2 share only 'server'; word or sentence embeddings are dense vectors learned from context so semantically similar words/tickets ('server down', 'site unavailable') land close together, which matters for search, clustering and classification with varied wording; TF-IDF remains strong for keyword search and as a fast, interpretable baseline.",
              "TF-IDF knows nothing about meaning: 'down', 'slow' and 'unavailable' are three unrelated columns, so a ticket saying 'site unavailable' looks nothing like 'server down'. Embeddings (word2vec/GloVe for words, sentence-transformer models for whole tickets) place words and sentences used in similar contexts near each other in a dense space, so those tickets would be neighbours -- better for semantic search, clustering and classifiers facing varied phrasing. TF-IDF is still the right first tool for keyword retrieval and an interpretable baseline, and it trains in seconds."
            ),
            part(
              "Technique per task",
              "Themes without labels: topic modelling (LDA or embedding-based clustering such as BERTopic); product and customer names: named-entity recognition (NER), possibly fine-tuned with custom entity types; angry tickets: sentiment analysis (a classifier or a fine-tuned transformer, with 'anger' as a label or negative-sentiment threshold); drafting replies: text generation with a large language model, retrieval-augmented from the knowledge base, with agents editing and never auto-sending.",
              "1) Main themes: topic modelling -- LDA over TF-IDF/bag-of-words, or clustering sentence embeddings (BERTopic-style) -- which groups tickets into 'login problems', 'billing', 'outages' without any labels. 2) Product and customer names: named-entity recognition, starting from a pre-trained NER model and fine-tuning with custom entity types (PRODUCT, CUSTOMER) on a few hundred annotated tickets. 3) Angry tickets: sentiment analysis, a fine-tuned text classifier scoring negative sentiment or a dedicated 'frustrated' label, with a threshold tuned for recall so no furious customer is missed. 4) Draft replies: text generation with an LLM grounded by retrieval from the help centre (RAG), presented to the agent as a draft to edit -- never sent automatically, and evaluated for accuracy and tone before rollout."
            ),
          ],
        },
      ],
    },
    {
      slug: "optimisation-framing-and-bandit-allocation",
      objective: "Optimization concepts compared and contrasted: constrained vs. unconstrained optimization, and multi-armed bandit problems",
      kind: "build",
      title: "Frame three optimisation problems and allocate traffic with a bandit",
      brief:
        "Three problems land on your desk at Thornfield Logistics the same week. (A) Choose how many parcels to route through each of three depots to minimise total cost, where each depot has a maximum daily capacity and every parcel must be assigned. (B) Fit the parameters of a delivery-time regression by minimising mean squared error on the training data. (C) Pick which of five versions of the 'track my parcel' page headline to show so that click-through is maximised over the coming month, while still learning which headline is best; the site gets 10,000 visits a day. For (C) the marketing team proposes an epsilon-greedy bandit with epsilon = 0.10.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify (A) and (B) as constrained or unconstrained and name a suitable method for each; for (C), explain why a bandit fits better than a fixed A/B test, compute the epsilon-greedy traffic allocation, and compare it with an alternative bandit strategy.",
          parts: [
            part(
              "Problem A",
              "Constrained optimisation: minimise total routing cost subject to depot capacity constraints (inequalities) and the assignment constraint that all parcels are routed (equality) with non-negativity; a linear program (simplex/interior point) or integer program if parcels are indivisible; mentions Lagrange multipliers/KKT conditions as the theory behind constrained optima.",
              "Constrained. Decision variables x_i = parcels to depot i; minimise sum of cost_i x x_i subject to x_i <= capacity_i for each depot (inequality constraints), x_1 + x_2 + x_3 = total parcels (equality constraint) and x_i >= 0. With linear costs that is a linear program solved by simplex or an interior-point method; if parcels cannot be split, an integer program. The KKT conditions (Lagrange multipliers for the constraints) characterise the optimum, and the multiplier on a depot's capacity tells you what another unit of capacity there is worth."
            ),
            part(
              "Problem B",
              "Unconstrained optimisation: minimise the MSE loss over the parameter vector with no restrictions on the parameters; solved by gradient descent (or in closed form for ordinary least squares via the normal equations); notes that adding an L1/L2 penalty would turn it into a constrained/regularised problem (ridge/LASSO).",
              "Unconstrained: the parameters can take any real values, and we minimise the MSE loss by setting its gradient to zero -- for ordinary least squares that has a closed form (the normal equations), and for larger or non-linear models gradient descent or its variants walk downhill using partial derivatives of the loss. The moment you add a ridge (L2) or LASSO (L1) penalty you are solving an equivalent constrained problem -- minimise MSE subject to a budget on the coefficient norm."
            ),
            part(
              "Why a bandit, and the epsilon-greedy allocation",
              "Explains the explore-exploit trade-off: a fixed A/B test splits traffic evenly for the whole test (20% each) and keeps showing poor headlines until it ends, while a bandit shifts traffic toward winners as evidence arrives, reducing regret; computes epsilon-greedy with epsilon = 0.10 and five arms: 90% of visits to the current best arm plus 10% spread evenly over all five (2% each), so the best arm gets 92% (9,200 visits a day) and each of the other four gets 2% (200 visits a day).",
              "A fixed A/B/n test would send 2,000 visits a day to each headline for the whole month, including the ones that are clearly losing -- that lost click-through is the 'regret' a bandit minimises by exploiting what it has learned while still exploring. Epsilon-greedy with epsilon = 0.10: with probability 0.90 show the headline with the best observed click-through; with probability 0.10 pick one of the five uniformly at random. Each arm's share of the random 10% is 0.10 / 5 = 2%. So the current leader receives 90% + 2% = 92% of traffic (9,200 of 10,000 daily visits) and each other headline 2% (200 visits) -- enough to keep estimating them and to switch if one overtakes."
            ),
            part(
              "An alternative strategy",
              "Compares with Thompson sampling (sample each arm's click-through from its posterior Beta distribution and show the arm with the highest draw) or UCB (pick the arm with the highest upper confidence bound), which explore in proportion to uncertainty and automatically reduce exploration as evidence accumulates, usually beating a fixed epsilon; notes the bandit's assumptions (stationary click-through, immediate feedback) and when a classic A/B test is still preferred (need for a clean causal estimate, delayed outcomes).",
              "Thompson sampling keeps a Beta(clicks + 1, non-clicks + 1) posterior per headline, draws one sample from each and shows the highest draw: uncertain arms get sampled more early on and starve naturally as their posteriors sharpen, so exploration shrinks over time instead of staying fixed at 10% forever. UCB does the same deterministically by picking the arm with the highest mean plus a confidence bonus that shrinks with visits. Both typically achieve lower regret than epsilon-greedy. Bandits assume click-through is stationary and feedback is immediate; if the business needs a precise causal estimate of each headline's effect, or the outcome arrives days later (deliveries completed), a fixed-horizon A/B test is still the cleaner instrument."
            ),
          ],
        },
      ],
    },
  ],
};
