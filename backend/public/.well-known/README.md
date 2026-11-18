# Digital Asset Links

`assetlinks.json` tells Google that `ascendra-learn.com` and the Android app
`com.hel1x.ascendra` are the same product. Without it, a credential saved in
Google Password Manager against the website is never offered inside the app,
which is why the login screen's email field stopped suggesting anything when
it was switched to the `username` autofill hint: that hint asks Android for a
credential belonging to *this app*, and no such association existed.

The single `delegate_permission/common.get_login_creds` relation is the one
that shares login credentials. Android App Links -- https:// URLs opening the
app directly -- would need `delegate_permission/common.handle_all_urls` here
*and* `autoVerify` intent filters in `mobile/app.json`, which the app does not
currently declare, so that relation is deliberately absent rather than
included and inert.

## The association has two halves (FAIL-1167)

Google's autofill shares a saved web password with the app only when both
sides say so ([Digital Asset Links, creating a statement](https://developers.google.com/digital-asset-links/v1/create-statement);
[Android autofill, "Associate website and mobile app data"](https://developer.android.com/identity/autofill/autofill-optimize)):

1. **The website lists the app**: this file, with the
   `delegate_permission/common.get_login_creds` relation and an `android_app`
   target (package name plus signing-certificate fingerprints).
2. **The app lists the website**: an `asset_statements` meta-data in
   AndroidManifest.xml pointing at a string resource that holds the statement
   list (`namespace: web`, `site: https://www.ascendra-learn.com`).
   Expo writes neither, so `mobile/plugins/withAssetStatements.js` (listed in
   `mobile/app.json`) does. Until it shipped, only half 1 existed and Android
   never offered the web password in the app. Half 2 changes the native
   project, so it reaches phones only in a **new build**, not an OTA update.

This file does not need a `web` statement of its own for this: the site's side
of the association is the `android_app` statement above.

## The fingerprint

`sha256_cert_fingerprints` lists the signing certificates Google will accept.
The one present is the EAS-managed keystore used by the `preview` and
`production` build profiles, read from the signed APK itself rather than
copied from a dashboard:

```
eas build:view <build-id> --json        # get applicationArchiveUrl
curl -L -o app.apk "<applicationArchiveUrl>"
keytool -printcert -jarfile app.apk     # v1-signed APKs only
```

EAS builds are v2/v3 signed and carry no v1 JAR signature, so `keytool
-jarfile` reports "Not a signed jar file". The certificate has to come out of
the APK Signing Block instead; `apksigner verify --print-certs app.apk` from
the Android SDK build-tools is the supported way.

**This list must grow when distribution changes.** Which fingerprint matters
depends on who installed the app:

- Internal APKs (EAS `preview` profile, sideloaded): signed with the
  EAS-managed keystore, the fingerprint already listed.
- Installs from Google Play with Play App Signing: Google re-signs the app, and
  the certificate the phone sees is the **Play app signing key**, not the EAS
  keystore (which is only the *upload* key there). Add that fingerprint (Play
  Console, Setup, App integrity, "App signing key certificate", SHA-256)
  alongside this one rather than replacing it, so internal builds keep
  working. Copy it from the console; do not derive or guess it.

Until the Play app signing fingerprint is listed, autofill association works
for internal builds only.

## Verifying it is live

```
curl -s https://www.ascendra-learn.com/.well-known/assetlinks.json
```

It must return the JSON over https with no redirect. Google re-crawls on its
own schedule, so credential suggestions can take a while to appear after the
file goes up.
