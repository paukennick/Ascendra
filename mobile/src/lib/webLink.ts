// FAIL-2441 (sidebar) and FAIL-2442 (Home footer, sign-in legal links):
// react-native-web leaves Enter on an element with role="link" to the
// browser, which does nothing for an anchor without an href. Such a link can
// be focused but not opened from the keyboard.
//
// A link on the web is therefore a real <a href> (react-native-web renders
// one for `href` on a Pressable, View or Text). Enter and a click both arrive
// as a click, which calls onPress; onPress stops the browser's own page load
// and navigates in the app instead. A click with Ctrl, Cmd or Shift is left
// to the browser (a new tab or window).
//
// Spread the result on the element: `{...linkProps(Platform.OS, "/faq", go)}`.
// The native apps get only onPress, exactly as before.
type ClickLike = { preventDefault?: () => void; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean };

export function webLink(href: string, activate: () => void): { href: string; onPress: (e: ClickLike) => void } {
  return {
    href,
    onPress: (e: ClickLike) => {
      if (e?.metaKey || e?.ctrlKey || e?.shiftKey) return;
      e?.preventDefault?.();
      activate();
    },
  };
}

export function linkProps(os: string, href: string, activate: () => void): { href?: string; onPress: (e: ClickLike) => void } {
  if (os === "web") return webLink(href, activate);
  return { onPress: () => activate() };
}
