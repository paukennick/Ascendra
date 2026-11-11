// REQ-205: the "I am 16 or older" confirmation on email sign-up and on a
// first-time Google sign-up. It is REQ-206's shared Checkbox (role, checked
// state, aria-checked and Space on the web, a 44 point tap target, the words
// beside the box), so the two screens cannot drift apart again.
import React from "react";
import { Checkbox } from "@/components/ui";
import { AGE_CONFIRMATION_LABEL } from "@/lib/ageConfirmation";

export function AgeCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return <Checkbox checked={checked} onChange={() => onToggle()} label={AGE_CONFIRMATION_LABEL} />;
}
