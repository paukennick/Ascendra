import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { api } from "@/api/client";
import { useGoogleAuthRequest } from "@/auth/googleSignIn";
import {
  Avatar,
  Button,
  Card,
  Divider,
  ErrorBanner,
  H2,
  ListRow,
  Muted,
  Screen,
  SectionHeader,
  TextField,
} from "@/components/ui";
import { Alert } from "@/lib/alert";
import { withBackgroundHold } from "@/lib/backgroundHold";
import { isShareDismissal } from "@/lib/mfaLeaveGuard";
import { colors } from "@/lib/theme";
import { browserDownloadEnv, downloadJson, exportFileName, fetchFullExport } from "@/lib/accountExport";
import { deleteAccountBody, linkGoogleBody, reauthPromptFor } from "@/lib/reauth";

import { useAuth } from "@/auth/AuthContext";

// A photo upload or a full data export is bigger than an ordinary request,
// so it gets longer than the client's 15 s default (FAIL-061).
const LARGE_REQUEST_TIMEOUT_MS = 60_000;

export default function Account() {
  const router = useRouter();
  const { user, logout, logoutAll, refreshUser } = useAuth();
  const { clientId, signInAsync } = useGoogleAuthRequest();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName ?? "");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  // REQ-203 (FAIL-861): connecting Google asks the learner to confirm it's
  // them first, in a form shown under the Sign-in card.
  const [linking, setLinking] = useState(false);
  const [linkSecret, setLinkSecret] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const prompt = reauthPromptFor(user);

  async function uploadAvatar(asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64) return;
    setAvatarBusy(true);
    try {
      await api.post("/api/account/avatar", { imageBase64: asset.base64 }, { timeoutMs: LARGE_REQUEST_TIMEOUT_MS });
      await refreshUser();
    } catch (err) {
      Alert.alert("Couldn't update photo", (err as Error).message);
    } finally {
      setAvatarBusy(false);
    }
  }

  // The permission prompt, the photo library and the camera all report as
  // "background" on Android, so the background sign-out is held off while
  // they are open (FAIL-062, src/lib/backgroundHold.ts).
  async function pickFromLibrary() {
    const perm = await withBackgroundHold(() => ImagePicker.requestMediaLibraryPermissionsAsync());
    if (!perm.granted) {
      Alert.alert("Photo access needed", "Allow photo library access in your device settings to set a profile picture.");
      return;
    }
    const result = await withBackgroundHold(() =>
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      })
    );
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0]);
  }

  async function takePhoto() {
    const perm = await withBackgroundHold(() => ImagePicker.requestCameraPermissionsAsync());
    if (!perm.granted) {
      Alert.alert("Camera access needed", "Allow camera access in your device settings to take a profile picture.");
      return;
    }
    const result = await withBackgroundHold(() =>
      ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      })
    );
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0]);
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try {
      await api.delete("/api/account/avatar");
      await refreshUser();
    } catch (err) {
      Alert.alert("Couldn't remove photo", (err as Error).message);
    } finally {
      setAvatarBusy(false);
    }
  }

  function editAvatar() {
    const options: { text: string; onPress?: () => void; style?: "cancel" | "destructive" }[] = [
      { text: "Choose from library", onPress: pickFromLibrary },
      { text: "Take photo", onPress: takePhoto },
    ];
    if (user?.avatarDataUrl) {
      options.push({ text: "Remove photo", onPress: removeAvatar, style: "destructive" });
    }
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Profile photo", undefined, options);
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Name can't be empty.");
      return;
    }
    setNameBusy(true);
    setNameError(null);
    try {
      await api.patch("/api/auth/me", { displayName: trimmed });
      await refreshUser();
      setEditingName(false);
    } catch (err) {
      setNameError((err as Error).message);
    } finally {
      setNameBusy(false);
    }
  }

  // Tapping "Connect" first asks for the password (or a code) when the account
  // has one to give; an account with neither goes straight to Google and the
  // server says what it needs.
  function startConnectGoogle() {
    setLinkError(null);
    setLinkSecret("");
    if (prompt.kind === "secret") {
      setLinking(true);
      return;
    }
    void connectGoogle();
  }

  async function connectGoogle() {
    if (prompt.kind === "secret" && !linkSecret) {
      setLinkError(prompt.hint);
      return;
    }
    setGoogleBusy(true);
    setLinkError(null);
    try {
      const idToken = await signInAsync();
      if (!idToken) return;
      await api.post("/api/auth/oauth/google/link", linkGoogleBody(idToken, prompt, linkSecret));
      setLinking(false);
      setLinkSecret("");
      await refreshUser();
    } catch (err) {
      // A wrong password or code stays on the form so it can be retried.
      if (linking) setLinkError((err as Error).message);
      else Alert.alert("Couldn't connect Google", (err as Error).message);
    } finally {
      setGoogleBusy(false);
    }
  }

  function disconnectGoogle() {
    Alert.alert("Disconnect Google?", "You'll only be able to sign in with your password afterward.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          setGoogleBusy(true);
          try {
            await api.delete("/api/auth/oauth/google/link");
            await refreshUser();
          } catch (err) {
            Alert.alert("Couldn't disconnect Google", (err as Error).message);
          } finally {
            setGoogleBusy(false);
          }
        },
      },
    ]);
  }

  async function exportData() {
    setExportBusy(true);
    try {
      // REQ-135: the export is paged; this fetches and merges every page.
      // FAIL-061: each page is bigger than an ordinary request, so it gets
      // the longer timeout.
      const data = await fetchFullExport((path) =>
        api.get<Record<string, unknown>>(path, { timeoutMs: LARGE_REQUEST_TIMEOUT_MS })
      );
      if (Platform.OS === "web") {
        // REQ-205: a file download, not the share sheet.
        downloadJson(data, exportFileName(), browserDownloadEnv());
        return;
      }
      await withBackgroundHold(() =>
        Share.share({ message: JSON.stringify(data, null, 2), title: "Ascendra data export" })
      );
    } catch (err) {
      if (isShareDismissal(err)) return;
      Alert.alert("Couldn't export data", (err as Error).message);
    } finally {
      setExportBusy(false);
    }
  }

  // REQ-206: one tap used to end every session, this device's included.
  function confirmLogoutAll() {
    Alert.alert("Sign out of all devices?", "This ends every session, including this one. You'll need to sign in again everywhere.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out everywhere", style: "destructive", onPress: () => void logoutAll() },
    ]);
  }

  // REQ-203 (FAIL-870): every account confirms before deleting. A password
  // account types its password (as before); a Google-only account types a
  // code if it has two-factor, or signs in with Google again.
  async function confirmDelete() {
    let value = deletePassword;
    if (prompt.kind === "google" && !user?.hasPassword) {
      setDeleteError(null);
      let idToken: string | null = null;
      try {
        idToken = await signInAsync();
      } catch {
        idToken = null;
      }
      if (!idToken) {
        setDeleteError("Google sign-in didn't finish. Try again.");
        return;
      }
      value = idToken;
    } else if (!deletePassword) {
      setDeleteError(user?.hasPassword ? "Enter your password to confirm." : prompt.hint);
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.delete("/api/account", deleteAccountBody(user, prompt, value));
      await logout();
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <Screen>
      <Card style={{ alignItems: "center", gap: 4, paddingVertical: 24 }}>
        <Pressable
          onPress={editAvatar}
          disabled={avatarBusy}
          style={{ position: "relative" }}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          accessibilityState={{ disabled: avatarBusy, busy: avatarBusy }}
        >
          <Avatar name={user?.displayName ?? user?.email} imageUri={user?.avatarDataUrl} size={72} />
          <View style={styles.avatarBadge}>
            {avatarBusy ? (
              <ActivityIndicator size="small" color={colors.accentText} aria-hidden />
            ) : (
              <Feather name="camera" size={13} color={colors.accentText} />
            )}
          </View>
        </Pressable>

        {editingName ? (
          <View style={{ width: "100%", gap: 8, marginTop: 12 }}>
            <TextField
              label="Display name"
              value={nameInput}
              onChangeText={setNameInput}
              error={nameError}
              autoCapitalize="words"
              maxLength={100}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button label="Save" onPress={saveName} loading={nameBusy} size="sm" />
              <Button
                label="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setEditingName(false);
                  setNameInput(user?.displayName ?? "");
                  setNameError(null);
                }}
              />
            </View>
          </View>
        ) : (
          <Pressable
            // REQ-131: nameInput was seeded from `user` once, at first mount,
            // so a name changed elsewhere (another device, after the profile
            // reloaded) showed up stale here. Reseed when editing starts.
            onPress={() => {
              setNameInput(user?.displayName ?? "");
              setNameError(null);
              setEditingName(true);
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, minHeight: 48 }}
            accessibilityRole="button"
            accessibilityLabel={`Display name: ${user?.displayName ?? "not set"}. Edit`}
          >
            <H2>{user?.displayName ?? "Signed in"}</H2>
            <Feather name="edit-2" size={14} color={colors.mutedDim} />
          </Pressable>
        )}
        <Muted>{user?.email}</Muted>
      </Card>

      <SectionHeader label="Sign-in" />
      <Card style={{ gap: 0 }}>
        <ListRow icon="mail" label="Change email" onPress={() => router.push("/account/change-email")} />
        {user?.hasPassword ? (
          <>
            <Divider />
            <ListRow icon="lock" label="Change password" onPress={() => router.push("/account/change-password")} />
          </>
        ) : null}
        <Divider />
        {googleBusy ? (
          <ListRow icon="globe" label="Google" value="Working..." />
        ) : user?.googleLinked ? (
          <ListRow
            icon="globe"
            label="Google"
            value={user?.hasPassword ? "Connected · Disconnect" : "Connected"}
            onPress={user?.hasPassword ? disconnectGoogle : undefined}
          />
        ) : (
          <ListRow icon="globe" label="Google" value={clientId ? "Connect" : "Unavailable"} onPress={clientId ? startConnectGoogle : undefined} />
        )}
      </Card>

      {linking ? (
        <Card>
          <Muted>Connecting a Google account changes how you can sign in, so confirm it's you first. Your other devices will be signed out; this one stays signed in.</Muted>
          <Muted>{prompt.hint}</Muted>
          {linkError ? <ErrorBanner message={linkError} /> : null}
          {prompt.kind === "secret" ? (
            <TextField
              label={prompt.label}
              value={linkSecret}
              onChangeText={setLinkSecret}
              secureTextEntry={prompt.secure}
              placeholder={prompt.secure ? "••••••••" : "123456"}
              textContentType={prompt.secure ? "password" : "oneTimeCode"}
              autoComplete={prompt.secure ? "current-password" : "one-time-code"}
              icon="lock"
            />
          ) : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Continue with Google" onPress={connectGoogle} loading={googleBusy} size="sm" disabled={!linkSecret} />
            <Button
              label="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => {
                setLinking(false);
                setLinkSecret("");
                setLinkError(null);
              }}
            />
          </View>
        </Card>
      ) : null}

      <SectionHeader label="Devices" />
      <Card style={{ gap: 0 }}>
        <ListRow icon="smartphone" label="Active sessions" onPress={() => router.push("/account/sessions")} />
      </Card>
      <Card>
        <Muted>
          Using a new phone or computer? Just sign in there with your email and password (or Google) — your
          courses and progress are saved to your account, not this device.
        </Muted>
      </Card>

      <SectionHeader label="Your data" />
      <Card style={{ gap: 0 }}>
        <ListRow
          icon="download"
          label="Export my data"
          onPress={exportData}
          right={exportBusy ? <ActivityIndicator size="small" color={colors.accent} /> : undefined}
        />
      </Card>

      <SectionHeader label="Session" />
      <Card style={{ gap: 0 }}>
        <ListRow icon="log-out" label="Sign out" onPress={() => logout()} />
        <Divider />
        <ListRow icon="shield-off" label="Sign out of all devices" onPress={confirmLogoutAll} danger />
      </Card>

      <SectionHeader label="Danger zone" />
      <Card>
        {deleting ? (
          <>
            <Muted>
              This permanently deletes your account and everything in it — courses, progress, history, chat. This
              can't be undone.
            </Muted>
            {deleteError ? <ErrorBanner message={deleteError} /> : null}
            {user?.hasPassword || prompt.kind === "secret" ? (
              <>
                {user?.hasPassword ? null : <Muted>{prompt.hint}</Muted>}
                <TextField
                  label={user?.hasPassword ? "Password" : prompt.label}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry={user?.hasPassword ? true : prompt.kind === "secret" && prompt.secure}
                  textContentType={user?.hasPassword ? "password" : "oneTimeCode"}
                  autoComplete={user?.hasPassword ? "current-password" : "one-time-code"}
                  icon="lock"
                />
              </>
            ) : (
              <>
                <Muted>{prompt.hint}</Muted>
                {!clientId ? <Muted>Google sign-in isn't available here. Use the app on your phone to delete your account.</Muted> : null}
              </>
            )}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                label={prompt.kind === "google" && !user?.hasPassword ? "Confirm with Google and delete" : "Permanently delete"}
                variant="danger"
                onPress={confirmDelete}
                loading={deleteBusy}
                size="sm"
                disabled={prompt.kind === "google" && !user?.hasPassword && !clientId}
              />
              <Button label="Cancel" variant="ghost" size="sm" onPress={() => { setDeleting(false); setDeletePassword(""); setDeleteError(null); }} />
            </View>
          </>
        ) : (
          <ListRow icon="trash-2" label="Delete account" onPress={() => setDeleting(true)} danger />
        )}
      </Card>
    </Screen>
  );
}

const styles = {
  avatarBadge: {
    position: "absolute" as const,
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};
