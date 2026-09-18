import { Platform } from "react-native";
import { colors } from "@/lib/theme";

// Chrome paints its own opaque background on autofilled inputs (the yellow
// box), and it can't be overridden by a normal background-color -- the UA
// style wins. The long-standing workaround is an inset box-shadow, which
// paints over it, plus -webkit-text-fill-color for the text itself, which
// Chrome also forces. The absurd transition duration is the other half of
// the trick: Chrome re-applies the background on focus/blur, and a
// background-color transition that effectively never completes keeps it
// from ever showing.
//
// This is injected at runtime rather than put in a custom app/+html.tsx,
// because adding that file replaces Expo's generated HTML shell -- which
// carries the favicon link and the react-native-web style reset.
const CSS = `
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px ${colors.cardAlt} inset !important;
  box-shadow: 0 0 0 1000px ${colors.cardAlt} inset !important;
  -webkit-text-fill-color: ${colors.text} !important;
  caret-color: ${colors.text};
  transition: background-color 600000s 0s, color 600000s 0s;
}
`;

const STYLE_ID = "ascendra-autofill-styles";

export function installWebAutofillStyles(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}
