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

**This list must grow when distribution changes.** Shipping through Google
Play with Play App Signing means Google re-signs the app, and the certificate
users actually run is the Play app signing certificate, not this one. Add that
fingerprint (Play Console, Setup, App integrity) alongside this one rather
than replacing it, so sideloaded internal builds keep working.

## Verifying it is live

```
curl -s https://www.ascendra-learn.com/.well-known/assetlinks.json
```

It must return the JSON over https with no redirect. Google re-crawls on its
own schedule, so credential suggestions can take a while to appear after the
file goes up.
