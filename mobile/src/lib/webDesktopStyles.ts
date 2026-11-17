import { Platform } from "react-native";
import { desktopWebCss } from "@/lib/desktopWebCss";

// Installs desktopWebCss() (hover and keyboard focus on wide web windows,
// REQ-322) once, on the web only.
const STYLE_ID = "ascendra-desktop-web-styles";

export function installDesktopWebStyles(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = desktopWebCss();
  document.head.appendChild(style);
}
