// REQ-192: every sheet and dialog goes through this instead of React
// Native's Modal. A Modal is a separate native window (a portal on web), so
// it drew above the lock overlay (src/components/AppLock.tsx) and showed the
// sheet's content -- and took its taps -- while the app was locked. While
// locked the Modal is hidden; the component that opened it stays mounted
// with its state (and so does the screen under it), so the same sheet is
// back after unlocking. Back on Android goes to the lock, not the sheet.
import React from "react";
import { Modal, type ModalProps } from "react-native";
import { useLockCoversSheets } from "@/auth/AuthContext";

export function SheetModal({ visible = true, ...props }: ModalProps) {
  const locked = useLockCoversSheets();
  return <Modal {...props} visible={visible && !locked} />;
}
