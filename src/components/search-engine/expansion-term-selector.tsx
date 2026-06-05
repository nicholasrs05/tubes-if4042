import { Button } from "@/components/ui/button";
import { DEFAULT_EXPANSION_TERMS_COUNT } from "@/features/engine/ir-engine";
import type { SparseVectorType } from "@/types/document-vectors";

import { formatWeight, getVectorEntries } from "./utils";

type ExpansionTermSelectorProps = {
    termWeights: SparseVectorType;
    selectedTerms: string[];
    onToggleTerm: (term: string) => void;
    onSelectTopTerms: () => void;
    onSelectAllTerms: () => void;
    onClearTerms: () => void;
    onExpand: () => void;
    isExpanding: boolean;
};

export function ExpansionTermSelector({
    termWeights,
    selectedTerms,
    onToggleTerm,
    onSelectTopTerms,
    onSelectAllTerms,
    onClearTerms,
    onExpand,
    isExpanding,
}: ExpansionTermSelectorProps) {
    const { entries, total } = getVectorEntries(termWeights);
    const selectedTermsSet = new Set(selectedTerms);

    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                    <h4 className="text-base font-semibold tracking-tight text-blue-950">
                        Kandidat Term Ekspansi
                    </h4>
                    <p className="text-sm text-blue-900">
                        Semua term kandidat diurutkan dari bobot tertinggi. Secara default, sistem memilih {DEFAULT_EXPANSION_TERMS_COUNT} term teratas.
                    </p>
                    <p className="text-sm font-medium text-blue-950">
                        {selectedTerms.length} dari {total} term dipilih.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                    <Button type="button" variant="outline" onClick={onSelectTopTerms}>
                        Pilih {DEFAULT_EXPANSION_TERMS_COUNT} Teratas
                    </Button>
                    <Button type="button" variant="outline" onClick={onSelectAllTerms}>
                        Pilih Semua
                    </Button>
                    <Button type="button" variant="outline" onClick={onClearTerms}>
                        Kosongkan Term
                    </Button>
                    <Button type="button" onClick={onExpand} disabled={isExpanding || selectedTerms.length === 0}>
                        Perluas Query
                    </Button>
                </div>
            </div>

            {entries.length > 0 ? (
                <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-blue-100 bg-white">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-blue-50 text-left text-xs uppercase tracking-wide text-blue-900">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Pilih</th>
                                <th className="px-3 py-2 font-semibold">Term</th>
                                <th className="px-3 py-2 text-right font-semibold">Bobot</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(([term, weight], index) => (
                                <tr key={term} className="border-b border-blue-50 last:border-b-0">
                                    <td className="w-20 px-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedTermsSet.has(term)}
                                            onChange={() => onToggleTerm(term)}
                                            className="size-4 accent-blue-700"
                                            aria-label={`Pilih term ${term}`}
                                        />
                                    </td>
                                    <td className="max-w-0 px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
                                                #{index + 1}
                                            </span>
                                            <span className="truncate text-xs text-gray-800">{term}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-950">
                                        {formatWeight(weight)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm text-blue-900">
                    Tidak ada kandidat term positif dari dokumen feedback saat ini.
                </p>
            )}
        </div>
    );
}
