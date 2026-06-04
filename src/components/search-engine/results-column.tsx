import type { SearchResult } from "@/types/search-engine";

import { SearchResultCard } from "./search-result-card";

type ResultsColumnProps = {
    title: string;
    description: string;
    results: SearchResult[];
    selectedIndex: number | null;
    onSelect: (index: number) => void;
    showFeedbackToggle?: boolean;
    selectedRelevantDocumentIds?: string[];
    onToggleRelevant?: (documentId: string) => void;
};

export function ResultsColumn({
    title,
    description,
    results,
    selectedIndex,
    onSelect,
    showFeedbackToggle = false,
    selectedRelevantDocumentIds = [],
    onToggleRelevant,
}: ResultsColumnProps) {
    const relevantSet = new Set(selectedRelevantDocumentIds);

    return (
        <section className="space-y-3">
            <div>
                <h4 className="text-base font-semibold tracking-tight">{title}</h4>
                <p className="text-lg font-bold text-gray-600">{description}</p>
            </div>

            <div className="max-h-[38rem] space-y-3 overflow-y-auto pr-1">
                {results.map((result, index) => (
                    <SearchResultCard
                        key={`${title}-${result.documentId}-${index}`}
                        result={result}
                        index={index}
                        isSelected={selectedIndex === index}
                        onSelect={() => onSelect(index)}
                        showFeedbackToggle={showFeedbackToggle}
                        isRelevant={relevantSet.has(result.documentId)}
                        onToggleRelevant={onToggleRelevant}
                    />
                ))}

                {results.length === 0 && (
                    <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                        Tidak ada dokumen yang ditemukan.
                    </p>
                )}
            </div>
        </section>
    );
}
