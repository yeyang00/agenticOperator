import { listAggregateRuns } from "@/lib/rule-check/server-actions";
import { AggregatePageView } from "@/components/rule-check/AggregatePageView";

export default async function RuleCheckLandingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    actionRef?: string;
    client?: string;
    ruleId?: string;
    candidateId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const { rows, aggregate } = await listAggregateRuns({
    actionRef: params.actionRef,
    client: params.client,
    ruleId: params.ruleId,
    candidateId: params.candidateId,
    fromDate: params.fromDate,
    toDate: params.toDate,
    limit: 500,
  });

  const scopeBits: string[] = [];
  if (params.actionRef) scopeBits.push(params.actionRef);
  if (params.client) scopeBits.push(params.client);
  if (params.ruleId) scopeBits.push(`rule=${params.ruleId}`);
  if (params.candidateId) scopeBits.push(`cand=${params.candidateId}`);
  const scopeLabel = scopeBits.length > 0 ? scopeBits.join(" · ") : "all runs";

  return (
    <AggregatePageView rows={rows} aggregate={aggregate} scopeLabel={scopeLabel} />
  );
}
