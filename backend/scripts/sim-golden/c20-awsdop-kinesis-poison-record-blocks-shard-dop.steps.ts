// REQ-320: golden paths for the AWSDOP band of AWSDEA/kinesis-poison-record-blocks-shard
// (AWSDOP/kinesis-poison-record-blocks-shard-dop.band.json): the same case and paths, registered to the
// AWSDOP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dea-kinesis.steps.ts";

export const ENTRY = { course: "AWSDOP", slug: "kinesis-poison-record-blocks-shard-dop" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
