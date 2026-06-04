import type { SparseVectorType } from "@/types/document-vectors";

import { formatWeight, getVectorEntries } from "./utils";

type WeightTableProps = {
    title: string;
    vector: SparseVectorType;
    className?: string;
};

export function WeightTable({ title, vector, className = "" }: WeightTableProps) {
    const { entries, total } = getVectorEntries(vector);

    return (
        <div className={`flex h-full min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-4 ${className}`}>
            <div className="shrink-0 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold tracking-tight text-gray-900">{title}</h4>
                <span className="text-xs font-medium text-gray-500">{total} term berbobot</span>
            </div>

            {entries.length > 0 ? (
                <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                        <tbody>
                            {entries.map(([term, weight]) => (
                                <tr key={term} className="border-b border-gray-100 last:border-b-0">
                                    <td className="max-w-0 px-3 py-2 text-xs text-gray-700">
                                        <span className="block truncate">{term}</span>
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                        {formatWeight(weight)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="mt-3 shrink-0 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Belum ada bobot term untuk ditampilkan.
                </p>
            )}
        </div>
    );
}
