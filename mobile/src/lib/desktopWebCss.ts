import { colors } from "./theme.ts";
import { WEB_COLUMN_BREAKPOINT } from "./webColumn.ts";

// Desktop web sizing, step 2 (REQ-322): hover and keyboard focus for wide
// browser windows.
//
// react-native-web draws no hover state at all, and keyboard focus fell back
// to the browser's default ring, a thin dark outline that is hard to see on
// this dark theme. Both are added here as one small style sheet, the same way
// webAutofillStyles.ts adds its rules (an app/+html.tsx would replace Expo's
// HTML shell).
//
// Every rule sits inside a min-width media query, so a phone in a browser and
// any window 900px or narrower get nothing new, and the native apps never run
// this at all. Hover also requires a real pointer that can hover, so a touch
// laptop's tap does not leave a tint behind.
//
// - Focus: a 2px ring in the link color (5.9:1 on the page background),
//   shown only for keyboard focus (:focus-visible), not for mouse clicks.
//   Text fields keep their own focused border and are left alone.
// - Hover: a faint light wash over buttons and links that are not disabled.
//   It is a background image, so it keeps the control's own color and
//   rounded corners underneath.
export function desktopWebCss(breakpoint: number = WEB_COLUMN_BREAKPOINT, ring: string = colors.link): string {
  const min = breakpoint + 1;
  return `
@media (min-width: ${min}px) {
  [role="button"]:focus-visible,
  [role="link"]:focus-visible,
  [role="tab"]:focus-visible,
  [role="checkbox"]:focus-visible,
  [role="switch"]:focus-visible,
  [role="radio"]:focus-visible,
  a[href]:focus-visible,
  [tabindex]:not(input):not(textarea):focus-visible {
    outline: 2px solid ${ring} !important;
    outline-offset: 2px;
  }
}
@media (min-width: ${min}px) and (hover: hover) and (pointer: fine) {
  [role="button"]:not([aria-disabled="true"]):hover,
  [role="link"]:hover,
  a[href]:hover {
    background-image: linear-gradient(rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.06));
  }
}
`;
}
