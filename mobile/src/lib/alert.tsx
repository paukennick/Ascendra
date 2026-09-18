import React, { useCallback, useEffect, useState } from "react";
import { Alert as RNAlert, Platform } from "react-native";
import { ChoiceSheet, type ChoiceOption } from "@/components/ui";

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

type ShowFn = (title: string, message?: string, buttons?: AlertButton[]) => void;

let showImpl: ShowFn | null = null;

// Drop-in replacement for RN's Alert.alert -- react-native-web ships that as
// a hard no-op (`static alert() {}`), so every confirm/error dialog in the
// app silently did nothing on web (see Sidebar.tsx's favorites/recent bug).
// Same call shape as Alert.alert, so call sites only need to change their
// import, not their logic. Native keeps using the real Alert.alert, which
// already works fine there.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== "web") {
      RNAlert.alert(title, message, buttons);
      return;
    }
    if (!showImpl) {
      console.error("Alert.alert called before AlertHost mounted:", title, message);
      return;
    }
    showImpl(title, message, buttons);
  },
};

// Mounted once at the root (app/_layout.tsx) so Alert.alert can be called
// imperatively from anywhere -- plain functions, async handlers -- with no
// access to a React tree, exactly like RN's own Alert.alert.
export function AlertHost() {
  const [state, setState] = useState<{ title: string; message?: string; buttons: AlertButton[] } | null>(null);

  const show = useCallback<ShowFn>((title, message, buttons) => {
    setState({ title, message, buttons: buttons && buttons.length ? buttons : [{ text: "OK" }] });
  }, []);

  useEffect(() => {
    showImpl = show;
    return () => {
      if (showImpl === show) showImpl = null;
    };
  }, [show]);

  if (!state) return null;

  const options: ChoiceOption[] = state.buttons.map((b) => ({
    label: b.text ?? "OK",
    variant: b.style === "destructive" ? "danger" : state.buttons.length === 1 ? "primary" : "ghost",
    onPress: () => b.onPress?.(),
  }));

  return (
    <ChoiceSheet
      visible
      title={state.title}
      message={state.message}
      options={options}
      onCancel={() => setState(null)}
    />
  );
}
