import type { SearchResult } from "@/types/search-engine";

import { VectorChips } from "./vector-chips";

type SearchResultCardProps = {
    result: SearchResult;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    showFeedbackToggle?: boolean;
    isRelevant?: boolean;
    onToggleRelevant?: (documentId: string) => void;
};

export function SearchResultCard({
    result,
    index,
    isSelected,
    onSelect,
    showFeedbackToggle = false,
    isRelevant = false,
    onToggleRelevant,
}: SearchResultCardProps) {
    return (
        <div
            className={`rounded-xl border p-4 transition ${
                isSelected
                    ? "border-blue-400 bg-blue-50"
                    : isRelevant
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
            }`}
        >
            <div className="flex gap-3">
                {showFeedbackToggle && (
                    <label
                        className="mt-1 flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            checked={isRelevant}
                            onChange={() => onToggleRelevant?.(result.documentId)}
                            className="size-4 accent-emerald-600"
                        />
                        Relevan
                    </label>
                )}

                <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-500">
                                Rank {index + 1} - Dokumen {result.documentId}
                            </p>
                            <h4 className="text-base font-semibold text-gray-950">
                                {result.document?.title || "Tanpa judul"}
                            </h4>
                        </div>

                        <div className="shrink-0 rounded-md bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                            Skor {result.score.toFixed(4)}
                        </div>
                    </div>

                    {result.document?.author && (
                        <p className="mt-2 text-sm text-gray-600">
                            {result.document.author}
                        </p>
                    )}

                    {result.document?.content && (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-700">
                            {result.document.content}
                        </p>
                    )}

                    <VectorChips vector={result.weights} />
                </button>
            </div>
        </div>
    );
}
