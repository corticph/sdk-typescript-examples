import { WandSparkles } from "lucide-react";
import type { CortiAssistantChecklistItem } from "@/lib/corti-assistant-visit-config";

type CortiAssistantChecklistProps = {
  templateLabel: string;
  items: CortiAssistantChecklistItem[];
  canInjectCheatFacts?: boolean;
  hasInjectedCheatFacts?: boolean;
  isInjectingCheatFacts?: boolean;
  onInjectCheatFacts?: () => void;
};

export function CortiAssistantChecklist({
  templateLabel,
  items,
  canInjectCheatFacts = false,
  hasInjectedCheatFacts = false,
  isInjectingCheatFacts = false,
  onInjectCheatFacts,
}: CortiAssistantChecklistProps) {
  const isCheatButtonDisabled = !canInjectCheatFacts || isInjectingCheatFacts;

  return (
    <aside className="mt-3 min-h-0 self-start overflow-y-auto overscroll-contain border-t border-[hsl(var(--border))] pr-2 pt-3 max-xl:max-h-80 xl:absolute xl:inset-y-0 xl:right-0 xl:mt-0 xl:h-full xl:max-h-full xl:w-80 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
      <div>
        <div className="border-b border-[hsl(var(--border))] pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
            Ask checklist
          </p>
          <h3 className="mt-1 text-sm font-bold tracking-tight">{templateLabel}</h3>
        </div>

        <ol className="mt-3 space-y-2.5">
          {items.map((item, itemIndex) => (
            <li key={item.id} className="grid grid-cols-[1.25rem_1fr] gap-2">
              <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[hsl(var(--border))] font-mono-data text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                {itemIndex + 1}
              </div>
              <div>
                <h4 className="text-xs font-bold">{item.title}</h4>
                <ul className="mt-1 space-y-1">
                  {item.questions.map((question, questionIndex) => {
                    const inputId = `assistant-checklist-${item.id}-${questionIndex}`;

                    return (
                      <li key={question}>
                        <label
                          htmlFor={inputId}
                          className="grid cursor-pointer grid-cols-[0.875rem_1fr] gap-1.5 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]"
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            className="mt-0.5 h-3 w-3 rounded border-[hsl(var(--border))]"
                          />
                          <span>{question}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        {onInjectCheatFacts ? (
          <div className="mt-4 border-t border-[hsl(var(--border))] pt-3">
            <button
              type="button"
              onClick={onInjectCheatFacts}
              disabled={isCheatButtonDisabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <WandSparkles aria-hidden="true" className="h-3.5 w-3.5" />
              {isInjectingCheatFacts ? "Injecting facts..." : hasInjectedCheatFacts ? "Facts injected" : "Cheat"}
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
