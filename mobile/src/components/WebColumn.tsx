import type { ReactElement, ReactNode } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { colors, spacing } from "@/lib/theme";
import { gridColumns, isWideWeb, usesWebColumn, webHeaderInsets, WEB_COLUMN_MAX_WIDTH } from "@/lib/webColumn";

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

// REQ-322: true only in a web window wider than the breakpoint.
export function useWideWeb(): boolean {
  const { width } = useWindowDimensions();
  return isWideWeb(Platform.OS, width);
}

// REQ-322: cards per row for course lists (1 except on wide web windows).
export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  return gridColumns(Platform.OS, width);
}

// REQ-322: a stack's screenOptions with the header lined up with the column.
// The header background still spans the window; only its buttons and title
// move in. Screens with no column (sims, exams, labs, PBQ, narrow, native)
// get the options unchanged.
export function useColumnScreenOptions<T extends object>(base: T): (props: { route: { name: string } }) => T {
  const { width } = useWindowDimensions();
  return ({ route }) => ({ ...base, ...webHeaderInsets(Platform.OS, width, route.name) });
}

// REQ-322: one row of a course grid on a wide web window. Each cell takes an
// equal share; a short last row is padded with empty cells so its cards keep
// the same width as the rows above.
export function GridRow({ columns, cells }: { columns: number; cells: ReactNode[] }): ReactElement {
  const fillers = Math.max(0, columns - cells.length);
  return (
    <View style={styles.gridRow}>
      {cells.map((cell, i) => (
        <View key={i} style={styles.gridCell}>
          {cell}
        </View>
      ))}
      {Array.from({ length: fillers }, (_, i) => (
        <View key={`f${i}`} style={styles.gridCell} aria-hidden />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridRow: { flexDirection: "row", gap: spacing.md, alignItems: "stretch" },
  gridCell: { flex: 1, flexBasis: 0, minWidth: 0 },
  outer: { flex: 1, backgroundColor: colors.bg, alignItems: "center" },
  column: { flex: 1, width: "100%", maxWidth: WEB_COLUMN_MAX_WIDTH },
});
