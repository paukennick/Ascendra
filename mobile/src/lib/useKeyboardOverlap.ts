// REQ-217 (FAIL-1062): on Android 15 and later every app draws edge to edge and
// the system no longer shrinks the window for the soft keyboard (the
// "adjustResize" mode this app relied on), so the keyboard covered the field
// being typed in. KeyboardAvoidingView was only on for iOS. This measures how
// far the keyboard overlaps a view and the view pads itself by that much. When
// the system does still resize the window (Android 14 and below), the measured
// overlap is 0 and nothing is added.
import { useEffect, useState, type RefObject } from "react";
import { Keyboard, Platform, type View } from "react-native";
import { keyboardOverlap, needsManualKeyboardAvoidance } from "./keyboardOverlap.ts";

export function useKeyboardOverlap(ref: RefObject<View | null>): number {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (!needsManualKeyboardAvoidance(Platform.OS, Platform.Version)) return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      const node = ref.current;
      if (!node) return;
      node.measureInWindow((_x, y, _w, h) => setOverlap(keyboardOverlap(y + h, e.endCoordinates.screenY)));
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setOverlap(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ref]);
  return overlap;
}
