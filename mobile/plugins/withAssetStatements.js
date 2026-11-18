// FAIL-1167 (M8): lets Android offer a password saved for the website inside
// the app.
//
// Autofill services such as Google's share saved logins between a website and
// an app only when BOTH sides declare the association (Digital Asset Links):
//   * the website lists the app in /.well-known/assetlinks.json with the
//     `delegate_permission/common.get_login_creds` relation (backend/public/
//     .well-known/assetlinks.json, already there); and
//   * the app lists the website, in a statement list embedded in the manifest:
//     <meta-data android:name="asset_statements" android:resource="@string/asset_statements"/>
//     plus the list itself in res/values/strings.xml.
// Expo writes neither, so this plugin does. Without it Android found no
// statement from the app's side and never offered the web password.
//
// Sources:
//   https://developers.google.com/digital-asset-links/v1/create-statement
//     ("Android app statement lists": the manifest meta-data, the strings.xml
//     entry with escaped quotes, the statement syntax)
//   https://developer.android.com/identity/autofill/autofill-optimize
//     ("Associate website and mobile app data": a Digital Asset Link with the
//     get_login_creds relation on the site, and the association declared in
//     the app's AndroidManifest.xml)
//
// Native change: it alters AndroidManifest.xml and strings.xml, so it needs a
// new EAS build; an over-the-air update cannot deliver it (the runtime version
// is a fingerprint of the native config and will change).
//
// Usage in app.json: ["./plugins/withAssetStatements", { "site": "https://www.ascendra-learn.com" }]
const { withAndroidManifest, withStringsXml } = require("expo/config-plugins");

const RELATION = "delegate_permission/common.get_login_creds";
const NAME = "asset_statements";

// A site is an origin (scheme://host[:port], no path): Digital Asset Links
// match scheme, host and port exactly, and only https is accepted here.
function normalizeSite(site) {
  if (typeof site !== "string") throw new Error("withAssetStatements: pass { site: \"https://your-domain\" }.");
  let u;
  try {
    u = new URL(site);
  } catch {
    throw new Error(`withAssetStatements: "${site}" is not a URL.`);
  }
  if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash || (u.pathname !== "/" && u.pathname !== "")) {
    throw new Error(`withAssetStatements: "${site}" must be an https origin with no path, query or credentials.`);
  }
  return u.origin;
}

// The statement list the app makes about the site.
function statementList(site) {
  return [{ relation: [RELATION], target: { namespace: "web", site: normalizeSite(site) } }];
}

// Android resource strings take a double quote only escaped with a backslash
// (the form in Google's example); an apostrophe or a backslash would need the
// same, and none appears in a statement list built here.
function stringsValue(site) {
  const json = JSON.stringify(statementList(site));
  if (/['\\\n]/.test(json)) throw new Error("withAssetStatements: the statement list holds a character that needs more escaping.");
  return json.replace(/"/g, '\\"');
}

function addMetaData(manifest) {
  const app = manifest.manifest.application?.[0];
  if (!app) throw new Error("withAssetStatements: AndroidManifest.xml has no <application>.");
  const list = (app["meta-data"] = (app["meta-data"] ?? []).filter((m) => m.$["android:name"] !== NAME));
  list.push({ $: { "android:name": NAME, "android:resource": "@string/" + NAME } });
  return manifest;
}

function addString(strings, site) {
  const resources = strings.resources;
  const items = (resources.string = (resources.string ?? []).filter((s) => s.$.name !== NAME));
  items.push({ $: { name: NAME, translatable: "false" }, _: stringsValue(site) });
  return strings;
}

function withAssetStatements(config, props) {
  const site = normalizeSite(props && props.site); // fail the prebuild now, not at runtime
  config = withAndroidManifest(config, (c) => {
    c.modResults = addMetaData(c.modResults);
    return c;
  });
  return withStringsXml(config, (c) => {
    c.modResults = addString(c.modResults, site);
    return c;
  });
}

module.exports = withAssetStatements;
module.exports.normalizeSite = normalizeSite;
module.exports.statementList = statementList;
module.exports.stringsValue = stringsValue;
module.exports.addMetaData = addMetaData;
module.exports.addString = addString;
