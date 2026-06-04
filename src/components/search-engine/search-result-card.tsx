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
            className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
                isSelected
                    ? "border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20"
                    : isRelevant
                        ? "border-emerald-400 bg-emerald-50/50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-blue-300"
            }`}
        >
            {/* Subtle selection indicator line */}
            {isSelected && <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />}
            {isRelevant && !isSelected && <div className="absolute left-0 top-0 h-full w-1 bg-emerald-400" />}

            <div className="flex gap-4">
                {showFeedbackToggle && (
                    <label
                        className={`mt-1 flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                            isRelevant 
                                ? "border-emerald-500 bg-emerald-500 text-white shadow-sm hover:bg-emerald-600" 
                                : "border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-transparent hover:text-gray-200"
                        }`}
                        style={{ width: "24px", height: "24px" }}
                        onClick={(event) => event.stopPropagation()}
                        title="Tandai sebagai relevan"
                    >
                        <input
                            type="checkbox"
                            checked={isRelevant}
                            onChange={() => onToggleRelevant?.(result.documentId)}
                            className="hidden"
                        />
                        <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5 stroke-current stroke-2">
                            <path d="M3 7.5L5.5 10L11 4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </label>
                )}

                <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left outline-none">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Rank {index + 1} <span className="mx-1.5 opacity-50">•</span> Dokumen {result.documentId}
                            </p>
                            <h4 className="mt-1 text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                {result.document?.title || "Tanpa judul"}
                            </h4>
                        </div>

                        <div className="shrink-0 rounded-lg bg-gray-100/80 px-3 py-1 text-sm font-mono font-bold tabular-nums text-gray-700 ring-1 ring-inset ring-gray-200/50">
                            {result.score.toFixed(4)}
                        </div>
                    </div>

                    {result.document?.author && (
                        <p className="mt-1.5 text-sm font-medium text-gray-600">
                            {result.document.author}
                        </p>
                    )}

                    {result.document?.content && (
                        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-600">
                            {result.document.content}
                        </p>
                    )}

                    <VectorChips vector={result.weights} />
                </button>
            </div>
        </div>
    );
}