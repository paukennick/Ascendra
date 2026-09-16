import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, verdictColor, verdictIcon } from "@/lib/theme";

type IconName = React.ComponentProps<typeof Feather>["name"];
type TextStyleProp = React.ComponentProps<typeof Text>["style"];

// Shared press-scale micro-interaction. Plain RN Animated (no reanimated
// installed) is enough for a one-shot scale on press in/out.
function useScalePress(target = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: target, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  return { scale, onPressIn, onPressOut };
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
  elevated,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
}) {
  const { scale, onPressIn, onPressOut } = useScalePress(0.98);
  if (!onPress) {
    return <View style={[styles.card, elevated && shadow.sm, style]}>{children}</View>;
  }
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.card, elevated && shadow.sm, style]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function H1({ children, style }: { children: React.ReactNode; style?: TextStyleProp }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: TextStyleProp }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}
export function H3({ children, style }: { children: React.ReactNode; style?: TextStyleProp }) {
  return <Text style={[styles.h3, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: React.ReactNode; style?: TextStyleProp }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}
export function Muted({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: TextStyleProp;
  numberOfLines?: number;
}) {
  return (
    <Text style={[styles.muted, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function SectionHeader({ label, style }: { label: string; style?: ViewStyle }) {
  return <Text style={[styles.sectionHeader, style]}>{label}</Text>;
}

export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View style={styles.brandWrap}>
      <View style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Feather name="trending-up" size={size * 0.5} color={colors.accentText} />
      </View>
      <Text style={styles.brandName}>Ascendra</Text>
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

export function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  const initials = (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={{ color: colors.accent, fontWeight: "700", fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Badge({
  label,
  color,
  icon,
}: {
  label: string;
  color?: string;
  icon?: IconName;
}) {
  const c = color ?? colors.accent;
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(c, 0.16) }]}>
      {icon ? <Feather name={icon} size={12} color={c} /> : null}
      <Text style={[styles.badgeText, { color: c }]}>{label}</Text>
    </View>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  const c = verdictColor[verdict] ?? colors.mutedDim;
  const icon = (verdictIcon[verdict] ?? "help-circle") as IconName;
  return <Badge label={verdict} color={c} icon={icon} />;
}

export function Tag({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon ? (
        <Feather name={icon} size={13} color={active ? colors.accentText : colors.muted} style={{ marginRight: 6 }} />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger" | "link";
type ButtonSize = "md" | "sm";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  icon,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
}) {
  const { scale, onPressIn, onPressOut } = useScalePress(0.96);
  const isDisabled = disabled || loading;
  const iconColor =
    variant === "primary" ? colors.accentText : variant === "danger" ? "#2a0509" : colors.text;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, !fullWidth && { alignSelf: "flex-start" }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          variant === "link" ? styles.linkButton : styles.button,
          size === "sm" && variant !== "link" && styles.buttonSm,
          variant === "primary" && { backgroundColor: colors.accent },
          variant === "ghost" && { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
          variant === "danger" && { backgroundColor: colors.bad },
          isDisabled && { opacity: 0.5 },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={16} color={iconColor} style={{ marginRight: 8 }} /> : null}
            <Text
              style={[
                variant === "link" ? styles.linkText : styles.buttonText,
                variant === "ghost" && { color: colors.text },
                variant === "primary" && { color: colors.accentText },
                variant === "danger" && { color: "#2a0509" },
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  icon,
  onPress,
  size = 40,
  variant = "ghost",
}: {
  icon: IconName;
  onPress: () => void;
  size?: number;
  variant?: "ghost" | "solid";
}) {
  const { scale, onPressIn, onPressOut } = useScalePress(0.9);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.iconButton,
          { width: size, height: size, borderRadius: size / 2 },
          variant === "solid" && { backgroundColor: colors.accent, borderColor: colors.accent },
        ]}
      >
        <Feather name={icon} size={size * 0.45} color={variant === "solid" ? colors.accentText : colors.text} />
      </Pressable>
    </Animated.View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  icon,
  autoCapitalize = "none",
  keyboardType,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string | null;
  icon?: IconName;
} & Pick<TextInputProps, "autoCapitalize" | "keyboardType" | "textContentType" | "maxLength" | "multiline">) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, error ? { borderColor: colors.bad } : null]}>
        {icon ? <Feather name={icon} size={16} color={colors.mutedDim} style={{ marginRight: 8 }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedDim}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          style={styles.input}
          {...rest}
        />
      </View>
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Feather name="alert-circle" size={12} color={colors.bad} />
          <Text style={{ color: colors.bad, fontSize: 12 }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ProgressBar({ percent, height = 8 }: { percent: number; height?: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const widthAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(widthAnim, { toValue: clamped, duration: 500, useNativeDriver: false }).start();
  }, [clamped, widthAnim]);

  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            borderRadius: height / 2,
            width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
          },
        ]}
      />
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ padding: spacing.xl, alignItems: "center", gap: spacing.sm }}>
      <ActivityIndicator color={colors.accent} />
      {label ? <Muted>{label}</Muted> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={[styles.card, styles.errorBanner]}>
      <Feather name="alert-triangle" size={16} color={colors.bad} />
      <Text style={{ color: colors.bad, flex: 1 }}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  message,
}: {
  icon?: IconName;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Feather name={icon} size={24} color={colors.mutedDim} />
      </View>
      <Body style={{ fontWeight: "600" }}>{title}</Body>
      {message ? <Muted style={{ textAlign: "center" }}>{message}</Muted> : null}
    </View>
  );
}

export function ListRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const content = (
    <View style={styles.listRow}>
      <View style={[styles.listRowIcon, danger && { backgroundColor: withAlpha(colors.bad, 0.16) }]}>
        <Feather name={icon} size={16} color={danger ? colors.bad : colors.accent} />
      </View>
      <Text style={[styles.listRowLabel, danger && { color: colors.bad }]}>{label}</Text>
      {value ? <Muted numberOfLines={1} style={{ maxWidth: 140 }}>{value}</Muted> : null}
      {onPress ? <Feather name="chevron-right" size={18} color={colors.mutedDim} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {content}
    </Pressable>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  screenContent: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  h1: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.4 },
  h2: { color: colors.text, fontSize: 18, fontWeight: "700" },
  h3: { color: colors.text, fontSize: 15, fontWeight: "700" },
  body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.mutedDim,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  divider: { height: 1, backgroundColor: colors.border },
  brandWrap: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  brandMark: {
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  brandName: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  avatar: {
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.accentText },
  button: {
    flexDirection: "row",
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSm: { paddingVertical: 9, paddingHorizontal: 14 },
  buttonText: { fontWeight: "700", fontSize: 14 },
  linkButton: { paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  linkText: { color: colors.accent, fontWeight: "600", fontSize: 14 },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 13,
    fontSize: 15,
  },
  progressTrack: {
    backgroundColor: colors.cardAlt,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: withAlpha(colors.bad, 0.4),
    backgroundColor: withAlpha(colors.bad, 0.08),
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  listRowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: withAlpha(colors.accent, 0.16),
    alignItems: "center",
    justifyContent: "center",
  },
  listRowLabel: { color: colors.text, fontSize: 14, fontWeight: "600", flex: 1 },
});
