import type { SparseVectorType } from "@/types/document-vectors";
import { formatWeight, getVectorEntries } from "./utils";

type VectorChipsProps = {
    vector: SparseVectorType;
    limit?: number;
};

export function VectorChips({ vector, limit = 4 }: VectorChipsProps) {
    const { entries, total } = getVectorEntries(vector, limit);

    if (entries.length === 0) {
        return (
            <p className="mt-3 text-xs text-gray-500 italic">
                Bobot dokumen tidak tersedia.
            </p>
        );
    }

    return (
        <div className="mt-3 flex flex-wrap gap-2">
            {entries.map(([term, weight]) => (
                <span
                    key={term}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-0.5 pl-2.5 pr-1 text-xs text-gray-700 shadow-sm"
                >
                    <span className="font-medium">{term}</span>
                    <span className="rounded-full bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-blue-700 ring-1 ring-gray-200/50">
                        {formatWeight(weight)}
                    </span>
                </span>
            ))}
            {total > entries.length && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                    +{total - entries.length} term
                </span>
            )}
        </div>
    );
}