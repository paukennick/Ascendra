// REQ-162 (docs/sims.md 16, 17 step 5): the TicketBurst port's golden paths.
// Each path is a design (placements, the ASG settings, backups) plus the
// finance cuts. The prototype (cloud.html) is a pure function of the same
// inputs -- simulate(design), financeSavings(d, picks), score(sim, fin) --
// so the driver calls those directly instead of clicking through the UI.

export interface CloudPath {
  id: string;
  title: string;
  items: [string, string][]; // [component, slot]
  asg?: { azs: "a" | "b" | "ab"; min: number; max: number; size: string };
  backup: boolean;
  finance: string[];
  reasoning: "met" | "partial" | "missed";
}

const REF: [string, string][] = [
  ["route53", "edge"], ["cloudfront", "edge"], ["waf", "edge"], ["alb", "pub-a"], ["nat", "pub-a"], ["nat", "pub-b"], ["asg", "app-a"],
  ["rdsMulti", "data-a"], ["redis", "data-b"], ["sqs", "regional"], ["s3", "regional"],
];

export const PATHS: CloudPath[] = [
  { id: "reference", title: "The reference design and the safe finance cuts", items: REF, asg: { azs: "ab", min: 4, max: 16, size: "m6i.large" }, backup: true, finance: ["sched", "sp", "ri", "s3life", "cfttl"], reasoning: "met" },
  { id: "singleBox", title: "One EC2 instance, a Single-AZ database without backups, no CDN or NAT", items: [["alb", "pub-a"], ["ec2", "app-a"], ["rdsSingle", "data-a"], ["s3", "regional"]], backup: false, finance: [], reasoning: "missed" },
  { id: "overbuilt", title: "Overbuilt: large instances, Aurora and a high minimum", items: [["cloudfront", "edge"], ["waf", "edge"], ["alb", "pub-a"], ["nat", "pub-a"], ["nat", "pub-b"], ["asg", "app-a"], ["aurora", "data-a"], ["redis", "data-b"], ["sqs", "regional"], ["s3", "regional"]], asg: { azs: "ab", min: 6, max: 12, size: "c6i.2xlarge" }, backup: true, finance: ["sched", "rightsize", "sp", "ri", "s3life", "cfttl"], reasoning: "partial" },
  { id: "serverless", title: "Serverless: Lambda and DynamoDB", items: [["cloudfront", "edge"], ["waf", "edge"], ["lambda", "regional"], ["dynamo", "regional"], ["s3", "regional"]], backup: true, finance: ["httpapi", "sp", "s3life", "cfttl"], reasoning: "met" },
  { id: "luckyAzB", title: "Two AZs except the fleet and its only NAT, both in AZ b; no SQS or cache; finance drops WAF", items: [["cloudfront", "edge"], ["waf", "edge"], ["alb", "pub-a"], ["nat", "pub-b"], ["asg", "app-b"], ["rdsMulti", "data-b"], ["s3", "regional"]], asg: { azs: "b", min: 2, max: 16, size: "m6i.large" }, backup: true, finance: ["nowaf", "sp"], reasoning: "partial" },
  { id: "spikeShort", title: "ASG max too low for the spike, no backups", items: [["cloudfront", "edge"], ["alb", "pub-a"], ["nat", "pub-a"], ["nat", "pub-b"], ["asg", "app-a"], ["rdsMulti", "data-a"], ["sqs", "regional"]], asg: { azs: "ab", min: 2, max: 10, size: "m6i.large" }, backup: false, finance: ["sp", "ri", "cfttl", "dbsingle"], reasoning: "partial" },
];

export const FINANCE_IDS = ["sched", "rightsize", "httpapi", "sp", "ri", "s3life", "cfttl", "natunused", "nat1", "dbsingle", "dynprov", "nowaf", "nobackup"];
