// REQ-292: golden paths for the LFCS load-balancer case on the terminal
// screen (LFCS/sale-traffic-third-backend.sim.json). No prototype exists, so
// the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LFCS", slug: "sale-traffic-third-backend" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "error log, ss on app3 (127.0.0.1 only), fix the bind and curl app3; the ticket's line fails nginx -t, drop slow_start, test, reload, curl checkout",
        reasoning: "met",
        drive: (c) => {
          run(c, "errLog");
          run(c, "ssApp3");
          run(c, "fixBind");
          run(c, "curlApp3");
          run(c, "addTicket");
          run(c, "nginxT");
          run(c, "dropSlow");
          run(c, "nginxT");
          run(c, "reload");
          run(c, "curlShop");
          close(c);
          c.act("document", { cause: "capacity", fix: "added" });
        },
      },
      {
        id: "restartBroken",
        title: "Pastes the ticket's line and restarts nginx: the configuration is invalid and the load balancer stops",
        reasoning: "missed",
        drive: (c) => {
          run(c, "errLog");
          run(c, "addTicket");
          run(c, "restart");
          run(c, "curlShop");
          close(c);
          c.act("document", { cause: "nginx", fix: "restart" });
        },
      },
      {
        id: "addNoBind",
        title: "Adds app3 cleanly, tests and reloads, but never checks app3 listens on its address",
        reasoning: "partial",
        drive: (c) => {
          run(c, "errLog");
          run(c, "addPlain");
          run(c, "nginxT");
          run(c, "reload");
          run(c, "curlShop");
          close(c);
          c.act("document", { cause: "capacity", fix: "added" });
        },
      },
      {
        id: "untestedLate",
        title: "Adds app3 and reloads untested, waits past the sale email, then finds and fixes app3's bind",
        reasoning: "partial",
        drive: (c) => {
          run(c, "addPlain");
          run(c, "reload");
          waitUntil(c, 31);
          run(c, "errLog");
          run(c, "ssApp3");
          run(c, "fixBind");
          run(c, "curlShop");
          close(c);
          c.act("document", { cause: "capacity", fix: "added" });
        },
      },
      {
        id: "reloadRefused",
        title: "Adds the ticket's line and reloads untested (refused, old configuration kept), then fixes the bind, drops slow_start, tests and reloads",
        reasoning: "partial",
        drive: (c) => {
          run(c, "showConf");
          run(c, "addTicket");
          run(c, "reload");
          run(c, "errLog");
          run(c, "ssApp3");
          run(c, "fixBind");
          run(c, "dropSlow");
          run(c, "nginxT");
          run(c, "reload");
          run(c, "curlShop");
          close(c);
          c.act("document", { cause: "capacity", fix: "added" });
        },
      },
      {
        id: "givesUp",
        title: "Restarts nginx with nothing changed and closes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restart");
          close(c);
          c.act("document", { cause: "nginx", fix: "restart" });
        },
      },
    ],
  };
}
