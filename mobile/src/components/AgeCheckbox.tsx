// REQ-205: the "I am 16 or older" confirmation on email sign-up and on a
// first-time Google sign-up. A real checkbox for assistive technology (role,
// checked state, a label that does not depend on the icon) with a tap target
// of at least 44 points; the box and the words both toggle it.
import React from "react";
import { Pressable, Text } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { AGE_CONFIRMATION_LABEL } from "@/lib/ageConfirmation";
import { colors, fonts } from "@/lib/theme";

export function AgeCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={AGE_CONFIRMATION_LABEL}
      accessibilityState={{ checked }}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, marginTop: 4 }}
    >
      <Feather name={checked ? "check-square" : "square"} size={20} color={checked ? colors.accent : colors.mutedDim} />
      <Text style={{ color: colors.mutedDim, fontFamily: fonts.body, flex: 1, fontSize: 14, lineHeight: 20 }}>
        {AGE_CONFIRMATION_LABEL}
      </Text>
    </Pressable>
  );
}
