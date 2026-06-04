import type { SearchResult } from "@/types/search-engine";

import { WeightTable } from "./weight-table";

type DocumentDetailProps = {
    result: SearchResult | null;
    rank: number | null;
    phaseLabel: string;
};

export function DocumentDetail({ result, rank, phaseLabel }: DocumentDetailProps) {
    if (!result) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">
                    Pilih dokumen hasil ranking untuk melihat konten lengkap dan bobot term dokumennya.
                </p>
            </div>
        );
    }

    return (
        <div className="grid min-h-0 items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
            <div className="flex min-h-[20rem] flex-col rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-500">
                            {phaseLabel} - Rank {rank ?? "-"} - Dokumen {result.documentId}
                        </p>
                        <h4 className="text-base font-semibold">
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

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg bg-gray-50 p-3">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {result.document?.content || "Konten dokumen tidak tersedia."}
                    </p>
                </div>
            </div>

            <WeightTable title={`Bobot Dokumen ${result.documentId}`} vector={result.weights} className="max-h-160" />
        </div>
    );
}
