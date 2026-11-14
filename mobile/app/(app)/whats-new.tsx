import { Redirect } from "expo-router";
import { RELEASE_NOTES_ROUTE } from "@/lib/whatsNew";

// REQ-299: the old "What's new" history is now Release notes. An older app
// build, a bookmark or a link to /whats-new still lands on the right screen.
export default function WhatsNewMoved() {
  return <Redirect href={RELEASE_NOTES_ROUTE} />;
}
