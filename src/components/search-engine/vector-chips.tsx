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
            <p className="mt-3 text-xs text-gray-500">
                Bobot dokumen tidak tersedia.
            </p>
        );
    }

    return (
        <div className="mt-3 flex flex-wrap gap-2">
            {entries.map(([term, weight]) => (
                <span
                    key={term}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                    {term} {formatWeight(weight)}
                </span>
            ))}
            {total > entries.length && (
                <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-500">
                    +{total - entries.length} term
                </span>
            )}
        </div>
    );
}
