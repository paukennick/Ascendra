// REQ-335: golden paths for the AWSDVA band of AWSDEA/kinesis-poison-record-blocks-shard
// (AWSDVA/kinesis-poison-record-blocks-shard-dva.band.json): the same case and paths, registered to the
// AWSDVA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dea-kinesis.steps.ts";

export const ENTRY = { course: "AWSDVA", slug: "kinesis-poison-record-blocks-shard-dva" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
