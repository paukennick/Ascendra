// REQ-290: the one study-shortcuts setting for this device, shared by every
// screen and by Settings. A device preference like the lock timer (AsyncStorage,
// which is localStorage on the web), not per account, and not cleared at logout.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStudyShortcutsSetting } from "@/lib/studyShortcuts";

export const studyShortcutsSetting = createStudyShortcutsSetting(AsyncStorage);

export function useStudyShortcutsSetting(): { enabled: boolean; setEnabled: (on: boolean) => Promise<boolean> } {
  useEffect(() => {
    void studyShortcutsSetting.load();
  }, []);
  // The snapshot is a string so React compares it by value.
  useSyncExternalStore(studyShortcutsSetting.subscribe, studyShortcutsSetting.snapshot, studyShortcutsSetting.snapshot);
  const setEnabled = useCallback((on: boolean) => studyShortcutsSetting.set(on), []);
  return { enabled: studyShortcutsSetting.isEnabled(), setEnabled };
}
