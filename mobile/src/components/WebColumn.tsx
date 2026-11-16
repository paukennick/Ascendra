import type { ReactElement } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { colors } from "@/lib/theme";
import { usesWebColumn, WEB_COLUMN_MAX_WIDTH } from "@/lib/webColumn";

// The navigator's screenLayout: wraps each screen's content (below the header)
// in a centered column on wide web windows. Everywhere else it returns the
// screen untouched, so native and narrow layouts render exactly as before.
export function WebColumn({ route, children }: { route: { name: string }; children: ReactElement }): ReactElement {
  const { width } = useWindowDimensions();
  if (!usesWebColumn(Platform.OS, width, route.name)) return children;
  return (
    <View style={styles.outer}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

export function webColumnLayout(props: { route: { name: string }; children: ReactElement }): ReactElement {
  return <WebColumn route={props.route}>{props.children}</WebColumn>;
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg, alignItems: "center" },
  column: { flex: 1, width: "100%", maxWidth: WEB_COLUMN_MAX_WIDTH },
});
