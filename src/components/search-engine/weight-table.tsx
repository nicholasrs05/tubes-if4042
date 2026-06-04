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
        <div className={`flex h-full min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
            <div className="shrink-0 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-bold tracking-tight text-gray-900">{title}</h4>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    {total} term
                </span>
            </div>

            {entries.length > 0 ? (
                <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Term</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Bobot</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {entries.map(([term, weight]) => (
                                <tr key={term} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="max-w-0 px-3 py-2 text-xs font-medium text-gray-700">
                                        <span className="block truncate">{term}</span>
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-xs font-semibold tabular-nums tracking-tight text-gray-900">
                                        {formatWeight(weight)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="mt-3 flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500 italic">Belum ada bobot term.</p>
                </div>
            )}
        </div>
    );
}