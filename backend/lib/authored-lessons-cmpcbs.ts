import type { AuthoredLesson, AuthoredSource } from "@/lib/authored-lessons";

// REQ-195: authored lessons for the three CMPCBS objectives reframed from
// degree-plan lines into general courses (seed/data.ts CMPCBS_TRACK, units 0
// and 5). Every factual claim below is from the source listed with the
// lesson, checked on the date shown; nothing here names a school. The
// religion surveys describe what texts and traditions say and attribute each
// belief to those who hold it; they never present a doctrine as fact.
//
// The keys are written as index 0 here; authoredLesson() shuffles the stored
// order (seeded, so it is stable).

const CHECKED = "2026-11-09";
const src = (title: string, url: string): AuthoredSource => ({ title, url, checkedAt: CHECKED });

const WRITING_GUIDE = src("OpenStax, Writing Guide with Handbook (2021), 11.3 Glance at Genre: Reasoning Strategies and Signal Words", "https://openstax.org/books/writing-guide/pages/11-3-glance-at-genre-reasoning-strategies-and-signal-words");
const APA = src("APA Style, Author-date citation system", "https://apastyle.apa.org/style-grammar-guidelines/citations/basic-principles/author-date");
const MLA = src("Purdue OWL, MLA In-Text Citations: The Basics", "https://owl.purdue.edu/owl/research_and_citation/mla_style/mla_formatting_and_style_guide/mla_in_text_citations_the_basics.html");
const HAYES = src("Christine Hayes, Introduction to the Old Testament (Hebrew Bible), Open Yale Courses RLST 145, Lecture 1: The Parts of the Whole", "https://oyc.yale.edu/node/1724");
const MARTIN = src("Dale B. Martin, Introduction to New Testament History and Literature, Open Yale Courses RLST 152, Lecture 1", "https://oyc.yale.edu/religious-studies/rlst-152/lecture-1");
const WH1 = src("OpenStax, World History Volume 1 (2023), 4.4 The Hebrews", "https://openstax.org/books/world-history-volume-1/pages/4-4-the-hebrews");
const WH2 = src("OpenStax, World History Volume 2 (2022), 5.1 The Protestant Reformation", "https://openstax.org/books/world-history-volume-2/pages/5-1-the-protestant-reformation");
const BROOKS = src("Christopher Brooks, Western Civilization: A Concise History I (LibreTexts), 11.9 Orthodoxy and Heresy", "https://human.libretexts.org/Bookshelves/History/World_History/Book:_Western_Civilization_-_A_Concise_History_I_(Brooks)/11:_The_Late_Empire_and_Christianity/11.09:_Orthodoxy_and_Heresy");
const HANNEKEN = src("Todd Hanneken, Theological Questions (open textbook, 2022)", "https://open.umn.edu/opentextbooks/textbooks/theological-questions");

export const CMPCBS_COMPOSITION = "College composition: thesis, argument, evidence and APA/MLA citation";
export const CMPCBS_BIBLE_SURVEY = "Survey of the Old and New Testaments: canon, structure and literary genres";
export const CMPCBS_THEOLOGY_SURVEY = "Introduction to Christian theology: its main questions and how traditions answer them";

export const CMPCBS_AUTHORED: Record<string, AuthoredLesson> = {
  [CMPCBS_COMPOSITION]: {
    guessPrompt:
      "Before reading on: what makes a thesis statement different from a topic, and what do you think an in-text citation has to tell your reader?",
    cards: {
      cards: [
        {
          kind: "definition",
          title: "What it is",
          body:
            "College composition teaches academic writing as an argument you can check. You take a position on a question and state it as a thesis, the paper's central claim; every point you make should relate back to it. You support each reason with evidence, usually ideas, data or examples from credible print, electronic or personal sources, and you credit each source in the citation style the assignment names, most often APA or MLA.",
        },
        {
          kind: "why",
          title: "Why it matters",
          body:
            "Most academic writing is built on the writer's own ideas supported by the ideas of others. A clear, arguable thesis tells readers what you will show; citations let them find each source and see which ideas are yours and which you borrowed, which is what makes the work both checkable and honest.",
        },
        {
          kind: "example",
          title: "Worked example",
          body: "Turning a question into a supported, cited argument.",
          steps: [
            "Start from a question rather than a topic: should the campus library stay open 24 hours during exam weeks?",
            "Write a thesis that answers it and that a reader could dispute: the library should stay open 24 hours during exam weeks, because students need quiet late-night study space and the cost falls in a few weeks a year.",
            "Give each reason its own paragraph, open it with a sentence tying it to the thesis, and support it with evidence such as survey data, an expert source or an example.",
            "Cite each source where you use it and list it in full at the end. APA uses author and year: (Luna, 2020) in parentheses, or Luna (2020) in the sentence, with the entry in the References list. MLA uses author and page with no comma, as in (Wordsworth 263), with the entry in the Works Cited list.",
            "Reread the draft against the thesis and revise or cut any paragraph that does not support it.",
          ],
        },
        {
          kind: "mistake",
          title: "Common mistake",
          body:
            "Citing only direct quotations. A paraphrase or summary still uses another writer's ideas, so it needs an in-text citation and a full entry just as a quotation does, even when every word is your own.",
        },
      ],
      selfExplain: {
        step: 2,
        question: "Why would 'Many students study late at night' be a weak thesis for this paper?",
        modelExplanation:
          "It states a fact that nobody would dispute, so there is nothing to argue. A thesis takes a position a reader could disagree with, which is what the rest of the paper then supports.",
      },
    },
    practice: {
      fadeProblem:
        "An essay asks whether the campus library should stay open 24 hours during exam weeks. Which sentence works best as its thesis?",
      fadeChoices: [
        "The library should open 24 hours in exam weeks so students have late-night study space.",
        "The campus library is open from 7 a.m. until midnight on weekdays this semester.",
        "This essay will discuss how the library's opening hours change in exam weeks.",
        "Libraries have played an important part in university life for many centuries.",
      ],
      fadeCorrectIndex: 0,
      fadeWhy:
        "A thesis is the paper's central claim: it takes a position a reader could dispute and gives the reason, so each paragraph can tie back to it.",
      fadeOptionReasons: [
        "It takes a position someone could argue against and names the reason, so it can organise the paper.",
        "It is a fact anyone can check, so there is nothing to argue for.",
        "It announces the subject but takes no position on it.",
        "It is too broad and takes no position on the question the essay asks.",
      ],
      soloCheck:
        "A student paraphrases an idea from a 2020 article by Luna in a paper written in APA style. Which in-text citation follows APA's author-date system?",
      soloChoices: ["(Luna, 2020)", "(Luna 14)", "(2020, Luna)", "[Luna 1]"],
      soloCorrectIndex: 0,
      soloWhy:
        "APA cites the author's surname and the year, separated by a comma, in parentheses, or as Luna (2020) when the name is part of the sentence.",
      soloOptionReasons: [
        "Author, comma, year: APA's parenthetical author-date form.",
        "Author and page with no comma is MLA's author-page form, not APA's.",
        "APA puts the author first and the year second.",
        "APA does not number or bracket its in-text citations.",
      ],
    },
    sources: [WRITING_GUIDE, APA, MLA],
  },

  [CMPCBS_BIBLE_SURVEY]: {
    guessPrompt:
      "Before reading on: do you think Jewish, Catholic and Protestant Bibles contain the same books in the same order? What might differ?",
    cards: {
      cards: [
        {
          kind: "definition",
          title: "What it is",
          body:
            "An academic survey of the Old and New Testaments reads the Bible as a library of writings from different times and places, studied for their history, literature and composition rather than as scripture. Jews call their Bible the Tanakh, an acronym for its three divisions: Torah (instruction or teaching; Genesis through Deuteronomy), Nevi'im (Prophets) and Ketuvim (Writings). Those 24 books are the core common to every Bible. Christians call them the Old Testament and add the New Testament.",
        },
        {
          kind: "why",
          title: "Why it matters",
          body:
            "Traditions differ in which books they count and in what order, so a claim about 'the Bible' is only accurate for a named canon. Historical study also separates what the texts say from what other evidence shows: the archaeological record does not support a conquest of Canaan under Joshua as described, and the Tel Dan inscription is the one non-biblical reference to the 'house of David.'",
        },
        {
          kind: "example",
          title: "Worked example",
          body: "Placing one book, Isaiah, in each canon and reading it by genre.",
          steps: [
            "In the Tanakh, Isaiah sits in the Nevi'im (Prophets), among the Latter Prophets, whose books are poetic and oracular rather than narrative.",
            "Christian Old Testaments broadly follow the arrangement of the Greek translation (the Septuagint): books of things past (Genesis to Esther), then wisdom books (Job to the Song of Songs), then prophetic books (Isaiah to Malachi). There Isaiah opens the prophetic section.",
            "The Apocrypha are a further difference. Catholic Christianity includes them in its canon, a status it confirmed in the sixteenth century; Protestants deny them canonical status and treat them as useful reading.",
            "Read the book by its genre: as prophetic poetry and oracle, Isaiah is studied for its imagery, its audience and its historical setting, not as a chronicle of events.",
          ],
        },
        {
          kind: "mistake",
          title: "Common mistake",
          body:
            "Treating the survey as a test of belief. The course asks what the texts say, how and when they were composed, and what other evidence shows. It reports what traditions believe about the Bible (some hold it to be divinely inspired and without error) without asking you to accept or reject that belief. The New Testament is approached the same way, as a collection of historical documents.",
        },
      ],
      selfExplain: {
        step: 3,
        question: "Why does a survey course name whose canon it means before listing or counting books?",
        modelExplanation:
          "Because the canons differ: the 24 core books are shared, but Catholic Bibles also include the Apocrypha and Protestant Bibles do not, so a book list is only true for a named tradition.",
      },
    },
    practice: {
      fadeProblem: "In the Jewish Bible (the Tanakh), which division contains Genesis through Deuteronomy?",
      fadeChoices: ["Torah", "Nevi'im", "Ketuvim", "Apocrypha"],
      fadeCorrectIndex: 0,
      fadeWhy:
        "The Torah, meaning instruction or teaching, is the first division of the Tanakh: the five books from Genesis through Deuteronomy.",
      fadeOptionReasons: [
        "Torah is the first division, Genesis through Deuteronomy.",
        "Nevi'im is the second division, the Prophets.",
        "Ketuvim is the third division, the Writings, a miscellany of works.",
        "The Apocrypha are outside the 24 books of the Tanakh.",
      ],
      soloCheck:
        "A classmate says: 'Every Christian Bible has the same Old Testament books as the Jewish Bible.' Which response is accurate?",
      soloChoices: [
        "Not quite: the 24 core books are shared, but Catholic Bibles also include the Apocrypha.",
        "Yes: the Christian churches fixed one shared canon of books at the Council of Nicaea.",
        "No: Christian Old Testaments leave out the Torah and begin with the prophetic books.",
        "Yes: Catholic Bibles removed the Apocrypha from their canon in the sixteenth century.",
      ],
      soloCorrectIndex: 0,
      soloWhy:
        "The 24 books of the Tanakh are common to every Bible, but Catholic Christianity also counts the Apocrypha as canonical, which Protestants do not, so the claim fails for Catholic Bibles.",
      soloOptionReasons: [
        "The shared core plus the Catholic Apocrypha is what the canons show.",
        "The canons were not made the same: Catholic and Protestant Old Testaments still differ over the Apocrypha today.",
        "Christian Old Testaments open with Genesis, the first book of the Torah.",
        "The opposite happened: Catholic Christianity confirmed the Apocrypha as canonical in the sixteenth century.",
      ],
    },
    sources: [HAYES, MARTIN, WH1],
  },

  [CMPCBS_THEOLOGY_SURVEY]: {
    guessPrompt:
      "Before reading on: if two Christian traditions disagree about a doctrine, how could a course describe both fairly without deciding which is right?",
    cards: {
      cards: [
        {
          kind: "definition",
          title: "What it is",
          body:
            "Christian theology is the study of what Christians have taught about God, Jesus, salvation, the church and the end of history, and of how those teachings developed. An introductory survey describes the positions and their history and reports what each tradition holds without deciding which is true. A useful way in is to treat each doctrine as an answer to a question that a community asked at a particular time.",
        },
        {
          kind: "why",
          title: "Why it matters",
          body:
            "Christian traditions give different answers to the same questions, and many of those answers came out of real historical disputes. Knowing the question behind a doctrine lets you describe each tradition accurately and explains why the disagreement lasted.",
        },
        {
          kind: "example",
          title: "Worked example",
          body: "Comparing two answers to one question: what is the source of authority for Christian belief?",
          steps: [
            "State the question neutrally: what should guide Christian belief and practice?",
            "Give one answer with its context: in the Protestant Reformation, Martin Luther held that scripture alone should be the source of Christian belief and practice, and taught that faith alone was sufficient for salvation.",
            "Give the other answer with its context: the Catholic Council of Trent, which first met in 1545, accepted scripture as interpreted by the church, together with tradition, as sources of authority, and affirmed that both faith and good works were required for salvation.",
            "Report both as positions held by named groups ('Luther taught...', 'the Council of Trent affirmed...'), not as conclusions the course endorses.",
          ],
        },
        {
          kind: "mistake",
          title: "Common mistake",
          body:
            "Treating a doctrine as if it had always been settled. Many were defined in response to disputes. The Egyptian priest Arius argued that God the Father had created Jesus, so Jesus could not be the same as God; in 325 CE the emperor Constantine assembled the Council of Nicaea, which defined the official orthodoxy, and some Christians went on rejecting it.",
        },
      ],
      selfExplain: {
        step: 4,
        question: "Why does the survey attribute each teaching to the person or group that holds it?",
        modelExplanation:
          "Because the course describes beliefs rather than deciding between them. Naming who holds a position keeps the account accurate and fair to each tradition, and lets a reader of any belief or none follow it.",
      },
    },
    practice: {
      fadeProblem: "According to the Council of Trent, which first met in 1545, what is required for salvation?",
      fadeChoices: [
        "Both faith and good works are required for salvation.",
        "Faith by itself is sufficient for salvation.",
        "Good works by themselves are sufficient for salvation.",
        "Buying an indulgence is required for salvation.",
      ],
      fadeCorrectIndex: 0,
      fadeWhy:
        "The Council of Trent affirmed that both good works and faith were required for salvation, against the Protestant teaching that faith alone was sufficient.",
      fadeOptionReasons: [
        "This is what the council affirmed.",
        "That is Luther's teaching of justification by faith, which the council rejected.",
        "The council required faith as well as good works.",
        "The council kept indulgences but banned their sale, and did not make them a requirement.",
      ],
      soloCheck:
        "Which sentence describes Martin Luther's view of authority the way an academic survey of theology would?",
      soloChoices: [
        "Luther held that scripture alone should guide Christian belief and practice.",
        "Luther proved that scripture alone should guide Christian belief and practice.",
        "Luther held that scripture and church tradition carry equal authority.",
        "Luther held that a church council's rulings outrank scripture itself.",
      ],
      soloCorrectIndex: 0,
      soloWhy:
        "Luther taught that scripture alone should be the source of Christian belief and practice, and a survey reports that as his position rather than as a settled conclusion.",
      soloOptionReasons: [
        "Accurate and attributed: it reports Luther's position as his.",
        "The content is Luther's view, but 'proved' presents a contested doctrine as fact, which a neutral survey does not do.",
        "Scripture together with tradition is the position the Council of Trent accepted, not Luther's.",
        "Luther placed scripture above church authority, not below it.",
      ],
    },
    sources: [WH2, BROOKS, HANNEKEN],
  },
};
