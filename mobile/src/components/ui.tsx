import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { createPressGuard } from "@/lib/pressGuard";
import { BADGE_WASH, blend } from "@/lib/contrast";
import { t } from "@/lib/i18n";
import { isReducedMotion, useReducedMotion } from "@/lib/useReducedMotion";
import { colors, fonts, radius, readableOn, shadow, spacing, verdictColor, verdictIcon } from "@/lib/theme";

// REQ-113 (Audit 3 mobile M9, H4): Android's minimum touch target. Controls
// smaller than this to look at get hitSlop to reach it.
export const MIN_TOUCH = 48;
const slopFor = (w: number, h: number = w) => {
  const x = Math.max(0, Math.ceil((MIN_TOUCH - w) / 2));
  const y = Math.max(0, Math.ceil((MIN_TOUCH - h) / 2));
  return { top: y, bottom: y, left: x, right: x };
};

type IconName = React.ComponentProps<typeof Feather>["name"];
type TextStyleProp = React.ComponentProps<typeof Text>["style"];

// Animated Pressable so the scale transform lives on the same node Fabric
// hit-tests, not a wrapping View. Splitting them (Animated.View > Pressable)
// made every button here effectively require a long, held press that only
// registered in the sliver where the stale pre-transform hit rect still
// overlapped the visually-scaled button -- see
// https://github.com/facebook/react-native/issues/57502.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Shared press-scale micro-interaction. Plain RN Animated (no reanimated
// installed) is enough for a one-shot scale on press in/out.
// REQ-113 (L1): no scale when the system asks for reduced motion.
function useScalePress(target = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    if (isReducedMotion()) return;
    Animated.spring(scale, { toValue: target, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const onPressOut = () => {
    if (isReducedMotion()) return scale.setValue(1);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  return { scale, onPressIn, onPressOut };
}

// scrollRef (REQ-106): lets a screen bring new content into view, e.g. the
// top of the next Teach card after "Next card" at the bottom of a long one.
export function Screen({
  children,
  scrollRef,
}: {
  children: React.ReactNode;
  scrollRef?: React.Ref<ScrollView>;
}) {
  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
      // REQ-113 (M10): with the keyboard open, the first tap on a button
      // (e.g. "Check my answer") used to only close the keyboard.
      keyboardShouldPersistTaps="handled"
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
  accessibilityLabel,
  accessibilityHint,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  // REQ-113 (M8): a pressable card is announced as one button with this label.
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { scale, onPressIn, onPressOut } = useScalePress(0.98);
  if (!onPress) {
    return <View style={[styles.card, elevated && shadow.sm, style]}>{children}</View>;
  }
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[styles.card, elevated && shadow.sm, style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
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
  return (
    <Text style={[styles.sectionHeader, style]} accessibilityRole="header">
      {label}
    </Text>
  );
}

export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View style={styles.brandWrap}>
      <Image
        // REQ-113 (M2): a 192 px copy; the 1024 px app icon (741 KB) was
        // bundled just to draw this at 56 px.
        source={require("../../assets/brand-mark.png")}
        style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.28 }]}
      />
      <Text style={styles.brandName}>Ascendra</Text>
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

export function Avatar({
  name,
  size = 40,
  imageUri,
}: {
  name?: string | null;
  size?: number;
  imageUri?: string | null;
}) {
  const initials = (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={{ color: colors.link, fontFamily: fonts.displayBold, fontSize: size * 0.38 }}>{initials}</Text>
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
  // REQ-113 (M1): text lifted to 4.5:1 on its own wash (accent and muted
  // badges were 3.2:1).
  const wash = c.startsWith("#") && c.length === 7 ? blend(c, BADGE_WASH, colors.card) : null;
  const fg = wash ? readableOn(c, wash) : c;
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(c, BADGE_WASH) }]}>
      {icon ? <Feather name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// REQ-113 (L4): a verdict is information, not a mark against the learner.
// It used to show the raw word in lower case ("incorrect", in red).
export const VERDICT_LABEL: Record<string, string> = {
  correct: "Correct",
  partial: "Partly right",
  incorrect: "Not yet",
  ungraded: "Not graded",
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  const c = verdict === "incorrect" ? colors.warn : verdictColor[verdict] ?? colors.mutedDim;
  const icon = (verdict === "incorrect" ? "rotate-ccw" : verdictIcon[verdict] ?? "help-circle") as IconName;
  return <Badge label={VERDICT_LABEL[verdict] ?? verdict} color={c} icon={icon} />;
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
  // REQ-113 (M8, M9): a role and selected state (the selection was colour
  // only), and a 48 dp target.
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      hitSlop={{ top: 7, bottom: 7 }}
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
  accessibilityLabel,
}: {
  label: string;
  // Spoken instead of `label` when the visible text alone is ambiguous.
  accessibilityLabel?: string;
  // May return a promise; the button then ignores further presses until it
  // settles (see src/lib/pressGuard.ts).
  onPress: () => void | Promise<unknown>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
}) {
  const { scale, onPressIn, onPressOut } = useScalePress(0.96);
  const isDisabled = disabled || loading;
  // REQ-093: `disabled`/`loading` only take effect on the next render, so two
  // taps delivered in the same frame both reached onPress (a double
  // submit). The guard lives in a ref, which updates synchronously. The
  // latest onPress is read through a ref so a re-render between taps still
  // calls the current handler.
  const guard = useRef(createPressGuard()).current;
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const iconColor =
    variant === "primary" ? colors.accentText : variant === "danger" ? "#2a0509" : colors.text;

  return (
    <AnimatedPressable
      onPress={() => {
        guard.press(() => onPressRef.current());
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      // REQ-095: announce as a button (with its disabled/busy state) so the
      // new lesson actions aren't plain text to a screen reader.
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={[
        variant === "link" ? styles.linkButton : styles.button,
        size === "sm" && variant !== "link" && styles.buttonSm,
        variant === "primary" && { backgroundColor: colors.accent },
        variant === "ghost" && { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
        variant === "danger" && { backgroundColor: colors.bad },
        // REQ-113 (M1): a disabled filled button used to fade to 2.0:1. It now
        // takes the ghost surface with muted text (6:1), so it still reads
        // clearly while looking unavailable. Busy (loading) keeps its colour.
        disabled && !loading && variant !== "link" && styles.buttonDisabled,
        disabled && !loading && variant === "link" && { opacity: 0.6 },
        !fullWidth && { alignSelf: "flex-start" },
        { transform: [{ scale }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color={disabled && variant !== "link" ? colors.muted : iconColor} style={{ marginRight: 8 }} /> : null}
          <Text
            style={[
              variant === "link" ? styles.linkText : styles.buttonText,
              variant === "ghost" && { color: colors.text },
              variant === "primary" && { color: colors.accentText },
              variant === "danger" && { color: "#2a0509" },
              disabled && !loading && variant !== "link" && { color: colors.muted },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

// REQ-113 (Audit 3 mobile H4): icon-only buttons were read by TalkBack as
// "unlabelled" (no label, no role) and were 32-40 dp. The label is now
// required, the role and disabled state are set, and hitSlop brings the
// touch target to 48 dp whatever the drawn size.
export function IconButton({
  icon,
  onPress,
  size = 40,
  variant = "ghost",
  accessibilityLabel,
  accessibilityHint,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  size?: number;
  variant?: "ghost" | "solid";
  disabled?: boolean;
}) {
  const { scale, onPressIn, onPressOut } = useScalePress(0.9);
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={slopFor(size)}
      style={[
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        variant === "solid" && { backgroundColor: colors.accent, borderColor: colors.accent },
        disabled && { opacity: 0.5 },
        { transform: [{ scale }] },
      ]}
    >
      <Feather name={icon} size={size * 0.45} color={variant === "solid" ? colors.accentText : colors.text} />
    </AnimatedPressable>
  );
}

// Star toggle used on course cards. Deliberately its own small component
// rather than a generic IconButton variant -- filled/outline plus color
// swap on toggle is specific enough to this one interaction to keep separate.
export function FavoriteButton({
  active,
  onPress,
  size = 36,
}: {
  active: boolean;
  onPress: () => void;
  size?: number;
}) {
  const { scale, onPressIn, onPressOut } = useScalePress(0.85);
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={slopFor(size)}
      style={[
        { width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" },
        active && { backgroundColor: withAlpha(colors.warn, 0.16) },
        { transform: [{ scale }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={active ? "Remove from favorites" : "Add to favorites"}
      accessibilityState={{ selected: active }}
    >
      <Feather name="star" size={size * 0.5} color={active ? colors.warn : colors.mutedDim} />
    </AnimatedPressable>
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
  minHeight,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string | null;
  icon?: IconName;
  // For multiline fields -- a bare `multiline` still renders one line tall,
  // which reads as a single-line box the text scrolls inside of.
  minHeight?: number;
} & Pick<
  TextInputProps,
  "autoCapitalize" | "keyboardType" | "textContentType" | "autoComplete" | "importantForAutofill" | "maxLength" | "multiline"
>) {
  // REQ-113 (M8): the visible label was separate text, not linked to the
  // input, so a screen reader announced an unnamed field. The input now
  // carries the label (and any error) itself; web links them by id too.
  const labelId = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel} nativeID={`lbl-${labelId}`} importantForAccessibility="no">
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          error ? { borderColor: colors.bad } : null,
          minHeight ? { alignItems: "flex-start" } : null,
        ]}
      >
        {icon ? <Feather name={icon} size={16} color={colors.mutedDim} style={{ marginRight: 8, marginTop: minHeight ? 14 : 0 }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedDim}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          accessibilityLabel={error ? `${label}. ${error}` : label}
          aria-labelledby={`lbl-${labelId}`}
          style={[styles.input, minHeight ? { minHeight, textAlignVertical: "top" } : null]}
          {...rest}
        />
      </View>
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={12} color={colors.bad} />
          <Text style={{ color: colors.bad, fontSize: 12 }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Fill color reads the value, not what the bar represents (progress vs.
// mastery look identical otherwise) -- muted at 0 (nothing started yet,
// not a failure state), warn under halfway (underway), good at/past halfway
// (well underway). Mirrors the same three-tier grammar masteryColor already
// uses for per-objective status badges, rather than inventing new meaning.
function colorForPercent(percent: number): string {
  if (percent <= 0) return colors.mutedDim;
  if (percent < 50) return colors.warn;
  return colors.good;
}

export function ProgressBar({
  percent,
  height = 8,
  animated = true,
  accessibilityLabel,
}: {
  percent: number;
  height?: number;
  // REQ-113 (L3): long lists turn this off (one animation per row was heavy
  // on cheap phones).
  animated?: boolean;
  accessibilityLabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const reduceMotion = useReducedMotion();
  const still = !animated || reduceMotion;
  const widthAnim = useRef(new Animated.Value(still ? clamped : 0)).current;

  React.useEffect(() => {
    // REQ-113 (L1): no fill animation under reduced motion.
    if (still) widthAnim.setValue(clamped);
    else Animated.timing(widthAnim, { toValue: clamped, duration: 500, useNativeDriver: false }).start();
  }, [clamped, widthAnim, still]);

  return (
    <View
      style={[styles.progressTrack, { height, borderRadius: height / 2 }]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "progressbar" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityLabel ? { min: 0, max: 100, now: Math.round(clamped) } : undefined}
    >
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: colorForPercent(clamped),
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

// REQ-113 (M8): announced when it appears (alert role + live region); it
// used to be silent to a screen reader. (M6): an optional Retry, so a failed
// first load isn't a dead end that needs leaving and coming back.
export function ErrorBanner({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry?: () => void | Promise<unknown>;
  retryLabel?: string;
}) {
  return (
    <View
      style={[styles.card, styles.errorBanner]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Feather name="alert-triangle" size={16} color={colors.bad} />
        <Text style={{ color: colors.bad, flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>{message}</Text>
      </View>
      {onRetry ? (
        <Button
          label={retryLabel ?? t("error.retry")}
          icon="refresh-cw"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

// REQ-119 (Audit 3 product item 8): an empty screen says what it is for and
// offers one next action (`action`), instead of a dead end.
export function EmptyState({
  icon = "inbox",
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Feather name={icon} size={24} color={colors.mutedDim} />
      </View>
      <Body style={{ fontFamily: fonts.bodySemiBold }}>{title}</Body>
      {message ? <Muted style={{ textAlign: "center" }}>{message}</Muted> : null}
      {action ? (
        <Button label={action.label} icon={action.icon ?? "arrow-right"} size="sm" fullWidth={false} onPress={action.onPress} />
      ) : null}
    </View>
  );
}

export function ListRow({
  icon,
  label,
  value,
  onPress,
  danger,
  right,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  // Replaces the value text + chevron with a custom control (e.g. a Switch)
  // for rows that toggle a setting rather than navigate somewhere.
  right?: React.ReactNode;
}) {
  const content = (
    <View style={styles.listRow}>
      <View style={[styles.listRowIcon, danger && { backgroundColor: withAlpha(colors.bad, 0.16) }]}>
        <Feather name={icon} size={16} color={danger ? colors.bad : colors.accent} />
      </View>
      <Text style={[styles.listRowLabel, danger && { color: colors.bad }]}>{label}</Text>
      {right ? (
        right
      ) : (
        <>
          {value ? <Muted numberOfLines={1} style={{ maxWidth: 140 }}>{value}</Muted> : null}
          {onPress ? <Feather name="chevron-right" size={18} color={colors.mutedDim} /> : null}
        </>
      )}
    </View>
  );
  if (!onPress || right) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      {content}
    </Pressable>
  );
}

// Alert.alert with a button array doesn't work on web -- react-native-web
// ships it as a hard no-op (`static alert() {}`), so any onPress passed to
// it silently never fires there. This is the cross-platform replacement
// for that specific pattern (title + message + a list of buttons).
export interface ChoiceOption {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
}

export function ChoiceSheet({
  visible,
  title,
  message,
  options,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  options: ChoiceOption[];
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal transparent visible animationType={isReducedMotion() ? "none" : "fade"} onRequestClose={onCancel}>
      <Pressable style={styles.choiceBackdrop} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Dismiss">
        <Pressable style={styles.choiceSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.h3, { marginBottom: message ? spacing.xs : spacing.md }]} accessibilityRole="header">
            {title}
          </Text>
          {message ? <Body style={{ marginBottom: spacing.md }}>{message}</Body> : null}
          <View style={{ gap: spacing.sm }}>
            {options.map((opt) => (
              <Button
                key={opt.label}
                label={opt.label}
                variant={opt.variant ?? "ghost"}
                fullWidth
                onPress={() => {
                  onCancel();
                  opt.onPress();
                }}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
  choiceBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  choiceSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  screenContent: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  h1: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 26 },
  h2: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 19 },
  h3: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 16 },
  body: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  sectionHeader: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedDim,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  divider: { height: 1, backgroundColor: colors.border },
  brandWrap: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  brandMark: {
    ...shadow.sm,
  },
  brandName: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 20 },
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
  badgeText: { fontFamily: fonts.monoMedium, fontSize: 11 },
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
  chipText: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  chipTextActive: { color: colors.accentText },
  button: {
    flexDirection: "row",
    paddingVertical: 13,
    paddingHorizontal: 18,
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // REQ-113 (M9): every button at least 48 dp tall (small ones were ~36,
  // links ~39).
  buttonSm: { paddingVertical: 9, paddingHorizontal: 14, minHeight: MIN_TOUCH },
  buttonDisabled: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  linkButton: { paddingVertical: 10, minHeight: MIN_TOUCH, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  linkText: { color: colors.link, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    // REQ-113 (M1): the field's outline at 3:1 (was 1.2:1).
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 13,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  progressTrack: {
    backgroundColor: colors.cardAlt,
    overflow: "hidden",
  },
  progressFill: {
    // backgroundColor is set per-instance by colorForPercent() above, not here.
    height: "100%",
  },
  errorBanner: {
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
    minHeight: MIN_TOUCH,
  },
  listRowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: withAlpha(colors.accent, 0.16),
    alignItems: "center",
    justifyContent: "center",
  },
  listRowLabel: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14, flex: 1 },
});
