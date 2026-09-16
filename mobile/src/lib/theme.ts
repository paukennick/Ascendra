export const colors = {
  bg: "#0b1220",
  bgAlt: "#0d1526",
  card: "#141c2e",
  cardAlt: "#1a2338",
  cardPressed: "#202a42",
  border: "#243044",
  borderLight: "#2f3c54",
  text: "#f1f5f9",
  muted: "#8b96ab",
  mutedDim: "#5f6b81",
  accent: "#38bdf8",
  accentDim: "#0c4a6e",
  accentText: "#04202f",
  secondary: "#818cf8",
  good: "#34d399",
  goodDim: "#052e21",
  warn: "#fbbf24",
  warnDim: "#3a2a05",
  bad: "#fb7185",
  badDim: "#3a0d17",
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

export const masteryColor: Record<string, string> = {
  "Not started": colors.mutedDim,
  Introduced: colors.secondary,
  Guided: colors.accent,
  Independent: colors.good,
  "Transfer-ready": "#22c55e",
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
