import type { SearchResult } from "@/types/search-engine";

type DocumentDetailProps = {
    result: SearchResult | null;
    rank: number | null;
    phaseLabel: string;
};

export function DocumentDetail({ result, rank, phaseLabel }: DocumentDetailProps) {
    if (!result) {
        return (
            <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
                <p className="text-sm font-medium text-gray-500">
                    Pilih dokumen hasil ranking untuk melihat detail konten dan bobot term.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex min-h-[20rem] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-gray-100 pb-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 uppercase tracking-wider">
                                {phaseLabel}
                            </span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Rank {rank ?? "-"} <span className="mx-1 opacity-50">•</span> Dokumen {result.documentId}
                            </span>
                        </div>
                        <h4 className="mt-3 text-xl font-bold leading-tight text-gray-900">
                            {result.document?.title || "Tanpa judul"}
                        </h4>
                        {result.document?.author && (
                            <p className="mt-1.5 text-sm font-medium text-gray-600">
                                {result.document.author}
                            </p>
                        )}
                    </div>

                    <div className="shrink-0 flex flex-col items-end">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Skor Relevansi</span>
                        <div className="rounded-lg bg-blue-50 px-3 py-1.5 text-lg font-mono font-bold tabular-nums text-blue-700 ring-1 ring-inset ring-blue-200/50">
                            {result.score.toFixed(4)}
                        </div>
                    </div>
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {result.document?.content || <span className="italic text-gray-400">Konten dokumen tidak tersedia.</span>}
                    </p>
                </div>
            </div>
        </div>
    );
}