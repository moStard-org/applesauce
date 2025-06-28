import { getTagValue } from "applesauce-core/helpers";
import { NostrEvent } from "nostr-tools";

export enum JobStatus {
  PAYMENT = "payment-required",
  PROCESSING = "processing",
  ERROR = "error",
  SUCCESS = "success",
  PARTIAL = "partial",
}

/** Returns the status type for a job status event */
export function getStatusType(status: NostrEvent): JobStatus {
  return getTagValue(status, "status") as JobStatus;
}
