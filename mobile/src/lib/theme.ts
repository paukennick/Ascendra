// Color tokens, exactly, from the Ascendra design reference artifact's dark
// palette (claude.ai/artifact/SeaodNous5p8xRgW8tGGLo) -- adopted wholesale
// rather than approximated, since contrast there was already validated.
// That artifact also defines a light palette under the same variable names;
// this app is dark-only today, so only the dark set is carried over.
export const colors = {
  bg: "#14151B",
  bgAlt: "#1B1D26",
  card: "#1B1D26",
  cardAlt: "#21232E",
  cardPressed: "#242733",
  border: "#2E3040",
  borderLight: "#3B3E52",
  text: "#E9E8F1",
  muted: "#9EA1B0",
  mutedDim: "#767A89",
  accent: "#9698F5",
  accentDim: "#2A2B49",
  accentText: "#14151B",
  accentHover: "#ABADF7",
  secondary: "#ABADF7",
  good: "#5BC998",
  goodStrong: "#5BC998",
  goodDim: "#1D3227",
  warn: "#E3AC56",
  warnDim: "#3A2F18",
  bad: "#E38484",
  badDim: "#3A2323",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

// React Native's shadow* props only render on iOS; elevation covers Android.
export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 8,
  },
};

// Font families, matching the artifact: Fraunces (display/headings), Source
// Sans 3 (body/UI text), IBM Plex Mono (labels, chips, badges, eyebrows).
// The exact strings below are what @expo-google-fonts packages register the
// typefaces under once loaded (see App root's useFonts call) -- falls back
// to the system font automatically until loading finishes.
export const fonts = {
  displayMedium: "Fraunces_500Medium",
  displaySemiBold: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
  body: "SourceSans3_400Regular",
  bodyMedium: "SourceSans3_500Medium",
  bodySemiBold: "SourceSans3_600SemiBold",
  bodyBold: "SourceSans3_700Bold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
  monoSemiBold: "IBMPlexMono_600SemiBold",
};

export const masteryColor: Record<string, string> = {
  "Not started": colors.mutedDim,
  Introduced: colors.warn,
  Guided: colors.warn,
  Independent: colors.good,
  "Transfer-ready": colors.good,
  "Needs review": colors.bad,
};

export const masteryIcon: Record<string, string> = {
  "Not started": "circle",
  Introduced: "book-open",
  Guided: "compass",
  Independent: "check-circle",
  "Transfer-ready": "award",
  "Needs review": "alert-triangle",
};

export const verdictColor: Record<string, string> = {
  correct: colors.good,
  partial: colors.warn,
  incorrect: colors.bad,
  ungraded: colors.mutedDim,
};

export const verdictIcon: Record<string, string> = {
  correct: "check-circle",
  partial: "alert-circle",
  incorrect: "x-circle",
  ungraded: "help-circle",
};

export const trackTypeIcon: Record<string, string> = {
  certification: "award",
  graduate: "book",
};

// Per-course emoji + accent, matching the design reference's COURSES
// registry exactly (keyed by the same course codes seeded in
// backend/supabase/seed/data.ts). A track code not in this map (a
// user-created custom course) falls back to a plain Feather icon via
// trackTypeIcon above instead of a guessed emoji.
export const courseEmoji: Record<string, string> = {
  MSCS: "🎓",
  SECPLUS: "🔐",
  PYTHON: "🐍",
  JAVASCRIPT: "⚡",
  LINUXPLUS: "🐧",
  CYSAPLUS: "🛰️",
  PENTESTPLUS: "🎯",
  SECURITYX: "🏛️",
  CMPCBS: "📘",
};

export const courseAccent: Record<string, string> = {
  MSCS: "#4B4CBE",
  SECPLUS: "#B14A3D",
  PYTHON: "#2E7D5B",
  JAVASCRIPT: "#A5760B",
  LINUXPLUS: "#3D5A73",
  CYSAPLUS: "#5B4A8A",
  PENTESTPLUS: "#7A2E2E",
  SECURITYX: "#2E4A6B",
  CMPCBS: "#3D5A80",
};
