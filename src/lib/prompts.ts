export interface PromptRow {
  id: string;
  chapter: string;
  order_in_chapter: number;
}

export interface SkipRow {
  prompt_id: string;
  skipped_at: number; // ms epoch
}

export interface SelectArgs {
  prompts: PromptRow[];           // already filtered to current chapter, sorted or not
  answeredPromptIds: Set<string>; // story.prompt_id for the user
  skips: SkipRow[];               // skips for the user
  now: number;                    // ms epoch
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function selectNextPromptId(args: SelectArgs): string | null {
  const { prompts, answeredPromptIds, skips, now } = args;

  const recentSkipIds = new Set(
    skips.filter((s) => now - s.skipped_at < SEVEN_DAYS_MS).map((s) => s.prompt_id),
  );

  const eligible = prompts
    .filter((p) => !answeredPromptIds.has(p.id) && !recentSkipIds.has(p.id))
    .sort((a, b) => a.order_in_chapter - b.order_in_chapter);

  return eligible[0]?.id ?? null;
}
