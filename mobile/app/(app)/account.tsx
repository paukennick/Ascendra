import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Share, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
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
import { colors } from "@/lib/theme";
import { useAuth } from "@/auth/AuthContext";

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

  async function uploadAvatar(asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64) return;
    setAvatarBusy(true);
    try {
      await api.post("/api/account/avatar", { imageBase64: asset.base64 });
      await refreshUser();
    } catch (err) {
      Alert.alert("Couldn't update photo", (err as Error).message);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo access needed", "Allow photo library access in your device settings to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) await uploadAvatar(result.assets[0]);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera access needed", "Allow camera access in your device settings to take a profile picture.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
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

  async function connectGoogle() {
    setGoogleBusy(true);
    try {
      const idToken = await signInAsync();
      if (!idToken) return;
      await api.post("/api/auth/oauth/google/link", { idToken });
      await refreshUser();
    } catch (err) {
      Alert.alert("Couldn't connect Google", (err as Error).message);
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
      const data = await api.get<Record<string, unknown>>("/api/account/export");
      await Share.share({ message: JSON.stringify(data, null, 2), title: "Ascendra data export" });
    } catch (err) {
      Alert.alert("Couldn't export data", (err as Error).message);
    } finally {
      setExportBusy(false);
    }
  }

  async function confirmDelete() {
    if (user?.hasPassword && !deletePassword) {
      setDeleteError("Enter your password to confirm.");
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.delete("/api/account", user?.hasPassword ? { password: deletePassword } : undefined);
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
        <Pressable onPress={editAvatar} disabled={avatarBusy} style={{ position: "relative" }}>
          <Avatar name={user?.displayName ?? user?.email} imageUri={user?.avatarDataUrl} size={72} />
          <View style={styles.avatarBadge}>
            {avatarBusy ? (
              <ActivityIndicator size="small" color={colors.accentText} />
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
            onPress={() => setEditingName(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}
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
          <ListRow icon="globe" label="Google" value={clientId ? "Connect" : "Unavailable"} onPress={clientId ? connectGoogle : undefined} />
        )}
      </Card>

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
        <ListRow icon="log-out" label="Log out" onPress={() => logout()} />
        <Divider />
        <ListRow icon="shield-off" label="Log out of all devices" onPress={() => logoutAll()} danger />
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
            {user?.hasPassword ? (
              <TextField
                label="Password"
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                icon="lock"
              />
            ) : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button label="Permanently delete" variant="danger" onPress={confirmDelete} loading={deleteBusy} size="sm" />
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
