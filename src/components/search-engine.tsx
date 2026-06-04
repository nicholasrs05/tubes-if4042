import { useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { IREngine } from "@/features/engine/ir-engine";

import type { DocumentType } from "@/types/document-collections";
import type { SparseVectorType } from "@/types/document-vectors";
import type { SystemSettingsType } from "@/types/system-settings";
import type { BatchSearchResultType, SearchResultType } from "@/features/engine/ir-engine";

type SearchEngineProps = {
    irEngineRef: RefObject<IREngine>;
    systemSettings: SystemSettingsType;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
};

type ResultPhase = "before" | "after";

type SearchResult = {
    documentId: string;
    score: number;
    document: DocumentType | null;
    weights: SparseVectorType;
};

type SingleSearchState = {
    queryText: string;
    originalQuery: SparseVectorType;
    updatedQuery: SparseVectorType | null;
    beforeResults: SearchResult[];
    afterResults: SearchResult[];
    feedbackRelevantDocumentIds: string[];
    feedbackNonRelevantDocumentIds: string[];
};

type BatchQueryResult = {
    queryId: string;
    queryText: string;
    originalQuery: SparseVectorType;
    updatedQuery: SparseVectorType;
    beforeResults: SearchResult[];
    afterResults: SearchResult[];
    pass1AP: number | null;
    pass2AP: number | null;
    relevantDocumentCount: number;
    feedbackRelevantDocumentIds: string[];
    feedbackNonRelevantDocumentIds: string[];
};

function createDocumentProcessingSettingsSignature(settings: SystemSettingsType) {
    return JSON.stringify({
        stemWords: settings.stemWords,
        eliminateStopWords: settings.eliminateStopWords,
        documentTermFrequency: settings.documentTermFrequency,
        documentInverseDocumentFrequency: settings.documentInverseDocumentFrequency,
        documentNormalization: settings.documentNormalization,
    });
}

function mapSearchResultsWithDocuments(
    results: SearchResultType[],
    documentsById: Map<string, DocumentType>,
    irEngine: IREngine
): SearchResult[] {
    return results.map((result) => ({
        ...result,
        document: documentsById.get(result.documentId) ?? null,
        weights: irEngine.getDocumentVector(result.documentId),
    }));
}

function getDocumentsById(irEngine: IREngine) {
    return new Map(
        irEngine.documentsCollection?.documents.map((document) => [document.id, document]) ?? []
    );
}

function formatMetric(value: number | null) {
    return value === null ? "N/A" : value.toFixed(4);
}

function formatWeight(value: number) {
    if (Math.abs(value) >= 100) {
        return value.toFixed(2);
    }

    if (Math.abs(value) >= 1) {
        return value.toFixed(4);
    }

    return value.toPrecision(4);
}

function getVectorEntries(vector: SparseVectorType, limit?: number) {
    const entries = Object.entries(vector)
        .filter(([, weight]) => Number.isFinite(weight) && weight !== 0)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    return {
        entries: typeof limit === "number" ? entries.slice(0, limit) : entries,
        total: entries.length,
    };
}

function formatVectorForOutput(vector: SparseVectorType) {
    const { entries } = getVectorEntries(vector);

    if (entries.length === 0) {
        return "N/A";
    }

    return entries
        .map(([term, weight]) => `${term}:${formatWeight(weight)}`)
        .join(", ");
}

function formatDocumentIds(documentIds: string[]) {
    return documentIds.length > 0 ? documentIds.join(", ") : "Tidak ada";
}

function appendRanking(lines: string[], results: SearchResultType[]) {
    if (results.length === 0) {
        lines.push("Tidak ada dokumen yang ditemukan.");
        return;
    }

    results.forEach((result, index) => {
        lines.push(`${index + 1}. ${result.documentId} | score=${result.score.toFixed(6)}`);
    });
}

function buildBatchResultsOutput(batchResult: BatchSearchResultType) {
    const lines: string[] = [];

    lines.push("Batch Retrieval Results with Query Expansion");
    lines.push("============================================");
    lines.push(`Jumlah query: ${batchResult.queryResults.length}`);
    lines.push(`MAP sebelum ekspansi: ${formatMetric(batchResult.pass1MAP)}`);
    lines.push(`MAP setelah ekspansi: ${formatMetric(batchResult.pass2MAP)}`);
    lines.push("");

    for (const queryResult of batchResult.queryResults) {
        lines.push(`Query ${queryResult.queryId}`);
        lines.push(`Teks: ${queryResult.queryText}`);
        lines.push(`Bobot query awal: ${formatVectorForOutput(queryResult.originalQuery)}`);
        lines.push(`Bobot query setelah ekspansi: ${formatVectorForOutput(queryResult.updatedQuery)}`);
        lines.push(`Dokumen feedback relevan: ${formatDocumentIds(queryResult.feedbackRelevantDocumentIds)}`);
        lines.push(`Dokumen feedback nonrelevan: ${formatDocumentIds(queryResult.feedbackNonRelevantDocumentIds)}`);
        lines.push(`Jumlah dokumen relevan pada qrels: ${queryResult.relevantDocumentCount}`);
        lines.push(`Average Precision sebelum ekspansi: ${formatMetric(queryResult.pass1AP)}`);
        lines.push("Ranking sebelum ekspansi:");
        appendRanking(lines, queryResult.pass1Results);
        lines.push(`Average Precision setelah ekspansi: ${formatMetric(queryResult.pass2AP)}`);
        lines.push("Ranking setelah ekspansi:");
        appendRanking(lines, queryResult.pass2Results);
        lines.push("");
    }

    return lines.join("\n");
}

function WeightTable({
    title,
    vector,
    limit = 12,
}: {
    title: string;
    vector: SparseVectorType;
    limit?: number;
}) {
    const { entries, total } = getVectorEntries(vector, limit);
    const remainingCount = Math.max(total - entries.length, 0);

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold tracking-tight text-gray-900">{title}</h4>
                <span className="text-xs font-medium text-gray-500">{total} term berbobot</span>
            </div>

            {entries.length > 0 ? (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                        <tbody>
                            {entries.map(([term, weight]) => (
                                <tr key={term} className="border-b border-gray-100 last:border-b-0">
                                    <td className="max-w-0 px-3 py-2 font-mono text-xs text-gray-700">
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
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Belum ada bobot term untuk ditampilkan.
                </p>
            )}

            {remainingCount > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                    {remainingCount} term lain disembunyikan agar panel tetap ringkas.
                </p>
            )}
        </div>
    );
}

function VectorChips({ vector, limit = 4 }: { vector: SparseVectorType; limit?: number }) {
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
                    className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-700"
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

function SearchResultCard({
    result,
    index,
    isSelected,
    onSelect,
    showFeedbackToggle = false,
    isRelevant = false,
    onToggleRelevant,
}: {
    result: SearchResult;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    showFeedbackToggle?: boolean;
    isRelevant?: boolean;
    onToggleRelevant?: (documentId: string) => void;
}) {
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

function ResultsColumn({
    title,
    description,
    results,
    selectedIndex,
    onSelect,
    showFeedbackToggle = false,
    selectedRelevantDocumentIds = [],
    onToggleRelevant,
}: {
    title: string;
    description: string;
    results: SearchResult[];
    selectedIndex: number | null;
    onSelect: (index: number) => void;
    showFeedbackToggle?: boolean;
    selectedRelevantDocumentIds?: string[];
    onToggleRelevant?: (documentId: string) => void;
}) {
    const relevantSet = new Set(selectedRelevantDocumentIds);

    return (
        <section className="space-y-3">
            <div>
                <h4 className="text-base font-semibold tracking-tight">{title}</h4>
                <p className="text-sm text-gray-600">{description}</p>
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

function DocumentDetail({
    result,
    rank,
    phaseLabel,
}: {
    result: SearchResult | null;
    rank: number | null;
    phaseLabel: string;
}) {
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
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

            <WeightTable title={`Bobot Dokumen ${result.documentId}`} vector={result.weights} />
        </div>
    );
}

export function SearchEngine({ irEngineRef, systemSettings, searchQuery, setSearchQuery }: SearchEngineProps) {
    const [uploadedDocumentCollectionFile, setUploadedDocumentCollectionFile] = useState<File | null>(null);
    const [uploadedBatchQueryFile, setUploadedBatchQueryFile] = useState<File | null>(null);
    const [uploadedBatchRelevanceFeedbackFile, setUploadedBatchRelevanceFeedbackFile] = useState<File | null>(null);
    const [searchMode, setSearchMode] = useState<"single" | "batch">("single");
    const [singleSearch, setSingleSearch] = useState<SingleSearchState | null>(null);
    const [selectedRelevantDocumentIds, setSelectedRelevantDocumentIds] = useState<string[]>([]);
    const [selectedSinglePhase, setSelectedSinglePhase] = useState<ResultPhase>("before");
    const [selectedBeforeResultIndex, setSelectedBeforeResultIndex] = useState<number | null>(null);
    const [selectedAfterResultIndex, setSelectedAfterResultIndex] = useState<number | null>(null);
    const [batchSearchResults, setBatchSearchResults] = useState<BatchQueryResult[]>([]);
    const [batchOutputText, setBatchOutputText] = useState("");
    const [batchPass1MAP, setBatchPass1MAP] = useState<number | null>(null);
    const [batchPass2MAP, setBatchPass2MAP] = useState<number | null>(null);
    const [selectedBatchQueryIndex, setSelectedBatchQueryIndex] = useState<number | null>(null);
    const [selectedBatchPhase, setSelectedBatchPhase] = useState<ResultPhase>("before");
    const [selectedBatchResultIndex, setSelectedBatchResultIndex] = useState<number | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessingDocumentCollection, setIsProcessingDocumentCollection] = useState(false);
    const [documentCollectionStatus, setDocumentCollectionStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
    const [processedDocumentsCount, setProcessedDocumentsCount] = useState<number | null>(null);
    const [processedDocumentSettingsSignature, setProcessedDocumentSettingsSignature] = useState<string | null>(null);
    const processingRequestIdRef = useRef(0);

    function clearSearchOutputs() {
        setSingleSearch(null);
        setSelectedRelevantDocumentIds([]);
        setSelectedSinglePhase("before");
        setSelectedBeforeResultIndex(null);
        setSelectedAfterResultIndex(null);
        setBatchSearchResults([]);
        setBatchOutputText("");
        setBatchPass1MAP(null);
        setBatchPass2MAP(null);
        setSelectedBatchQueryIndex(null);
        setSelectedBatchPhase("before");
        setSelectedBatchResultIndex(null);
    }

    async function processDocumentCollection(file: File, shouldClearOutputs: boolean) {
        processingRequestIdRef.current += 1;
        const processingRequestId = processingRequestIdRef.current;
        const settingsSignature = createDocumentProcessingSettingsSignature(systemSettings);

        setSearchError(null);
        setDocumentCollectionStatus("processing");
        setIsProcessingDocumentCollection(true);

        if (shouldClearOutputs) {
            clearSearchOutputs();
        }

        try {
            const irEngine = irEngineRef.current;
            await irEngine.processDocumentCollection(file, systemSettings);

            if (processingRequestId !== processingRequestIdRef.current) {
                return false;
            }

            setProcessedDocumentsCount(irEngine.documentsCollection?.documents.length ?? 0);
            setProcessedDocumentSettingsSignature(settingsSignature);
            setDocumentCollectionStatus("done");
            return true;
        } catch (error) {
            if (processingRequestId !== processingRequestIdRef.current) {
                return false;
            }

            setProcessedDocumentSettingsSignature(null);
            setDocumentCollectionStatus("error");
            setSearchError(error instanceof Error ? error.message : "Terjadi kesalahan saat memproses koleksi dokumen.");
            return false;
        } finally {
            if (processingRequestId === processingRequestIdRef.current) {
                setIsProcessingDocumentCollection(false);
            }
        }
    }

    async function ensureDocumentCollectionReady() {
        if (!uploadedDocumentCollectionFile) {
            setSearchError("Unggah koleksi dokumen terlebih dahulu.");
            return false;
        }

        if (isProcessingDocumentCollection) {
            setSearchError("Koleksi dokumen sedang diproses. Tunggu hingga selesai.");
            return false;
        }

        const settingsSignature = createDocumentProcessingSettingsSignature(systemSettings);
        const irEngine = irEngineRef.current;

        irEngine.setSystemSettings(systemSettings);

        if (
            documentCollectionStatus === "done"
            && processedDocumentSettingsSignature === settingsSignature
            && irEngine.documentVectors
        ) {
            return true;
        }

        return processDocumentCollection(uploadedDocumentCollectionFile, false);
    }

    async function handleFileChange(
        event: ChangeEvent<HTMLInputElement>,
        fileType: "documentCollection" | "batchQuery" | "batchRelevanceFeedback"
    ) {
        const file = event.target.files?.[0];
        if (!file) return;

        switch (fileType) {
            case "documentCollection": {
                setUploadedDocumentCollectionFile(file);
                setProcessedDocumentsCount(null);
                setProcessedDocumentSettingsSignature(null);
                void processDocumentCollection(file, true);
                break;
            }
            case "batchQuery":
                setUploadedBatchQueryFile(file);
                setBatchSearchResults([]);
                setBatchOutputText("");
                setBatchPass1MAP(null);
                setBatchPass2MAP(null);
                setSelectedBatchQueryIndex(null);
                setSelectedBatchResultIndex(null);
                break;
            case "batchRelevanceFeedback":
                setUploadedBatchRelevanceFeedbackFile(file);
                setBatchSearchResults([]);
                setBatchOutputText("");
                setBatchPass1MAP(null);
                setBatchPass2MAP(null);
                setSelectedBatchQueryIndex(null);
                setSelectedBatchResultIndex(null);
                break;
        }
    }

    function getValidTopK() {
        const topK = Math.floor(systemSettings.topKRetrievedDocuments);

        if (!Number.isFinite(topK) || topK < 1) {
            setSearchError("Nilai top-k harus berupa bilangan bulat minimal 1.");
            return null;
        }

        return topK;
    }

    async function handleSearch() {
        setSearchError(null);
        clearSearchOutputs();

        const topK = getValidTopK();
        if (topK === null) return;

        setIsSearching(true);

        try {
            const collectionReady = await ensureDocumentCollectionReady();
            if (!collectionReady) return;

            const irEngine = irEngineRef.current;
            const documentsById = getDocumentsById(irEngine);

            if (searchMode === "batch") {
                if (!uploadedBatchQueryFile) {
                    setSearchError("Unggah file query batch terlebih dahulu.");
                    return;
                }

                const batchResult = await irEngine.searchBatch(
                    uploadedBatchQueryFile,
                    topK,
                    uploadedBatchRelevanceFeedbackFile ?? undefined
                );

                const mappedBatchResults: BatchQueryResult[] = batchResult.queryResults.map((queryResult) => ({
                    queryId: queryResult.queryId,
                    queryText: queryResult.queryText,
                    originalQuery: queryResult.originalQuery,
                    updatedQuery: queryResult.updatedQuery,
                    beforeResults: mapSearchResultsWithDocuments(queryResult.pass1Results, documentsById, irEngine),
                    afterResults: mapSearchResultsWithDocuments(queryResult.pass2Results, documentsById, irEngine),
                    pass1AP: queryResult.pass1AP,
                    pass2AP: queryResult.pass2AP,
                    relevantDocumentCount: queryResult.relevantDocumentCount,
                    feedbackRelevantDocumentIds: queryResult.feedbackRelevantDocumentIds,
                    feedbackNonRelevantDocumentIds: queryResult.feedbackNonRelevantDocumentIds,
                }));

                setBatchSearchResults(mappedBatchResults);
                setBatchPass1MAP(batchResult.pass1MAP);
                setBatchPass2MAP(batchResult.pass2MAP);
                setBatchOutputText(buildBatchResultsOutput(batchResult));
                setSelectedBatchQueryIndex(mappedBatchResults.length > 0 ? 0 : null);
                setSelectedBatchPhase("before");
                setSelectedBatchResultIndex(mappedBatchResults[0]?.beforeResults.length ? 0 : null);
                return;
            }

            const normalizedQuery = searchQuery.trim();

            if (!normalizedQuery) {
                setSearchError("Masukkan query pencarian terlebih dahulu.");
                return;
            }

            const initialSearch = irEngine.searchInitial(normalizedQuery, topK);
            const beforeResults = mapSearchResultsWithDocuments(initialSearch.pass1Results, documentsById, irEngine);

            setSingleSearch({
                queryText: normalizedQuery,
                originalQuery: initialSearch.originalQuery,
                updatedQuery: null,
                beforeResults,
                afterResults: [],
                feedbackRelevantDocumentIds: [],
                feedbackNonRelevantDocumentIds: [],
            });
            setSelectedBeforeResultIndex(beforeResults.length > 0 ? 0 : null);
            setSelectedAfterResultIndex(null);
            setSelectedSinglePhase("before");
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : "Terjadi kesalahan saat melakukan pencarian.");
        } finally {
            setIsSearching(false);
        }
    }

    function toggleRelevantDocument(documentId: string) {
        setSelectedRelevantDocumentIds((previousDocumentIds) => (
            previousDocumentIds.includes(documentId)
                ? previousDocumentIds.filter((selectedDocumentId) => selectedDocumentId !== documentId)
                : [...previousDocumentIds, documentId]
        ));
    }

    function handleSelectAllBeforeResultsAsRelevant() {
        if (!singleSearch) return;

        setSelectedRelevantDocumentIds(singleSearch.beforeResults.map((result) => result.documentId));
    }

    async function handleExpandSingleQuery() {
        setSearchError(null);

        if (!singleSearch) {
            setSearchError("Jalankan pencarian awal terlebih dahulu.");
            return;
        }

        if (selectedRelevantDocumentIds.length === 0) {
            setSearchError("Pilih minimal satu dokumen relevan untuk melakukan query expansion.");
            return;
        }

        const topK = getValidTopK();
        if (topK === null) return;

        setIsSearching(true);

        try {
            const collectionReady = await ensureDocumentCollectionReady();
            if (!collectionReady) return;

            const irEngine = irEngineRef.current;
            const documentsById = getDocumentsById(irEngine);
            const relevantSet = new Set(selectedRelevantDocumentIds);
            const nonRelevantDocumentIds = singleSearch.beforeResults
                .map((result) => result.documentId)
                .filter((documentId) => !relevantSet.has(documentId));
            const expandedSearch = irEngine.expandSearchWithFeedback(
                singleSearch.originalQuery,
                singleSearch.beforeResults,
                topK,
                selectedRelevantDocumentIds,
                nonRelevantDocumentIds
            );
            const afterResults = mapSearchResultsWithDocuments(expandedSearch.pass2Results, documentsById, irEngine);

            setSingleSearch({
                ...singleSearch,
                updatedQuery: expandedSearch.updatedQuery,
                afterResults,
                feedbackRelevantDocumentIds: expandedSearch.relevantDocumentIds,
                feedbackNonRelevantDocumentIds: expandedSearch.nonRelevantDocumentIds,
            });
            setSelectedAfterResultIndex(afterResults.length > 0 ? 0 : null);
            setSelectedSinglePhase("after");
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : "Terjadi kesalahan saat melakukan query expansion.");
        } finally {
            setIsSearching(false);
        }
    }

    function handleBatchDownload() {
        if (!batchOutputText) {
            return;
        }

        const outputBlob = new Blob([batchOutputText], { type: "text/plain;charset=utf-8" });
        const downloadUrl = URL.createObjectURL(outputBlob);
        const link = document.createElement("a");
        const sourceName = uploadedBatchQueryFile?.name.replace(/\.[^.]+$/, "") || "batch-query";

        link.href = downloadUrl;
        link.download = `${sourceName}-before-after-expansion-results.txt`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
    }

    const selectedSingleResult = singleSearch
        ? selectedSinglePhase === "before"
            ? selectedBeforeResultIndex !== null
                ? singleSearch.beforeResults[selectedBeforeResultIndex] ?? null
                : null
            : selectedAfterResultIndex !== null
                ? singleSearch.afterResults[selectedAfterResultIndex] ?? null
                : null
        : null;
    const selectedSingleRank = selectedSinglePhase === "before"
        ? selectedBeforeResultIndex !== null ? selectedBeforeResultIndex + 1 : null
        : selectedAfterResultIndex !== null ? selectedAfterResultIndex + 1 : null;
    const selectedBatchQuery =
        selectedBatchQueryIndex !== null ? (batchSearchResults[selectedBatchQueryIndex] ?? null) : null;
    const selectedBatchResults = selectedBatchQuery
        ? selectedBatchPhase === "before" ? selectedBatchQuery.beforeResults : selectedBatchQuery.afterResults
        : [];
    const selectedBatchResult =
        selectedBatchResultIndex !== null ? (selectedBatchResults[selectedBatchResultIndex] ?? null) : null;
    const selectedBatchRank = selectedBatchResultIndex !== null ? selectedBatchResultIndex + 1 : null;

    return (
        <div className="rounded-xl border-2 border-gray-300 p-6 md:p-8 space-y-8">
            <h2 className="text-2xl font-semibold tracking-tight">Search Engine</h2>

            <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">Unggah Koleksi Dokumen</h3>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                        type="file"
                        onClick={(event) => {
                            event.currentTarget.value = "";
                        }}
                        onChange={(event) => void handleFileChange(event, "documentCollection")}
                        className="block w-full max-w-sm text-sm"
                    />

                    {documentCollectionStatus === "processing" && (
                        <p className="text-sm font-medium text-amber-700">
                            Memproses dokumen...
                        </p>
                    )}

                    {documentCollectionStatus === "done" && (
                        <p className="text-sm font-medium text-green-700">
                            Selesai: {processedDocumentsCount ?? 0} dokumen ditemukan.
                        </p>
                    )}

                    {documentCollectionStatus === "error" && (
                        <p className="text-sm font-medium text-red-700">
                            Gagal memproses dokumen.
                        </p>
                    )}
                </div>

                {uploadedDocumentCollectionFile && (
                    <p className="text-sm text-gray-600">
                        File terpilih: {uploadedDocumentCollectionFile.name}
                    </p>
                )}
            </div>

            <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">Mode Pencarian</h3>

                <RadioGroup
                    className="flex flex-col gap-4 lg:flex-row lg:gap-10"
                    value={searchMode}
                    onValueChange={(value) => setSearchMode(value as "single" | "batch")}
                >
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="single" />
                        <Label className="text-base leading-none">Single</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="batch" />
                        <Label className="text-base leading-none">Batch</Label>
                    </div>
                </RadioGroup>
            </div>

            {searchMode === "single" && (
                <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-semibold tracking-tight">Masukkan Query Pencarian</h3>

                    <Input
                        type="text"
                        placeholder="Masukkan query pencarian..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="block w-full max-w-4xl text-sm"
                    />
                    <p className="text-sm text-gray-600">
                        Jalankan pencarian awal, centang dokumen yang relevan, lalu perluas query memakai dokumen relevan dan nonrelevan dari ranking awal.
                    </p>
                </div>
            )}

            {searchMode === "batch" && (
                <div className="flex flex-col gap-8 xl:flex-row xl:gap-10">
                    <div className="flex flex-col space-y-2 w-full max-w-md">
                        <h3 className="text-lg font-semibold tracking-tight">Unggah File Query Batch</h3>
                        <Input
                            type="file"
                            onChange={(event) => void handleFileChange(event, "batchQuery")}
                            className="block w-full max-w-sm text-sm"
                        />
                        {uploadedBatchQueryFile && (
                            <p className="text-sm text-gray-600">
                                File terpilih: {uploadedBatchQueryFile.name}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col space-y-2 w-full max-w-md">
                        <h3 className="text-lg font-semibold tracking-tight">Unggah File Qrels Batch</h3>
                        <Input
                            type="file"
                            onChange={(event) => void handleFileChange(event, "batchRelevanceFeedback")}
                            className="block w-full max-w-sm text-sm"
                        />
                        <p className="text-sm text-gray-600">
                            Opsional. Jika tersedia, qrels dipakai untuk feedback relevan dan MAP; jika tidak, batch memakai pseudo relevance feedback dari ranking awal.
                        </p>
                        {uploadedBatchRelevanceFeedbackFile && (
                            <p className="text-sm text-gray-600">
                                File terpilih: {uploadedBatchRelevanceFeedbackFile.name}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <Button className="p-6 text-lg" onClick={handleSearch} disabled={isSearching || isProcessingDocumentCollection}>
                {isSearching ? "Memproses..." : searchMode === "single" ? "Jalankan Pencarian Awal" : "Jalankan Pencarian Batch"}
            </Button>

            {searchError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {searchError}
                </p>
            )}

            {searchMode === "single" && singleSearch && (
                <div className="space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold tracking-tight">Query Expansion Single</h3>
                                <p className="text-sm text-gray-600">
                                    Ranking awal untuk query "{singleSearch.queryText}". Centang dokumen relevan; sisanya otomatis dihitung sebagai nonrelevan saat ekspansi.
                                </p>
                                <p className="text-sm text-gray-700">
                                    Relevan dipilih: {selectedRelevantDocumentIds.length}. Nonrelevan tersirat: {Math.max(singleSearch.beforeResults.length - selectedRelevantDocumentIds.length, 0)}.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button type="button" variant="outline" onClick={handleSelectAllBeforeResultsAsRelevant}>
                                    Tandai Semua Relevan
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setSelectedRelevantDocumentIds([])}>
                                    Kosongkan Pilihan
                                </Button>
                                <Button type="button" onClick={() => void handleExpandSingleQuery()} disabled={isSearching}>
                                    Perluas Query
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <WeightTable title="Bobot Query Awal" vector={singleSearch.originalQuery} />
                        <WeightTable
                            title="Bobot Query Setelah Ekspansi"
                            vector={singleSearch.updatedQuery ?? {}}
                        />
                    </div>

                    {singleSearch.updatedQuery && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-sm font-semibold text-emerald-800">
                                    Dokumen feedback relevan
                                </p>
                                <p className="mt-1 text-sm text-emerald-900">
                                    {formatDocumentIds(singleSearch.feedbackRelevantDocumentIds)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-sm font-semibold text-amber-800">
                                    Dokumen feedback nonrelevan
                                </p>
                                <p className="mt-1 text-sm text-amber-900">
                                    {formatDocumentIds(singleSearch.feedbackNonRelevantDocumentIds)}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-6 xl:grid-cols-2">
                        <ResultsColumn
                            title="Sebelum Query Expansion"
                            description={`${singleSearch.beforeResults.length} dokumen teratas dari query awal.`}
                            results={singleSearch.beforeResults}
                            selectedIndex={selectedBeforeResultIndex}
                            onSelect={(index) => {
                                setSelectedBeforeResultIndex(index);
                                setSelectedSinglePhase("before");
                            }}
                            showFeedbackToggle
                            selectedRelevantDocumentIds={selectedRelevantDocumentIds}
                            onToggleRelevant={toggleRelevantDocument}
                        />

                        <ResultsColumn
                            title="Setelah Query Expansion"
                            description={
                                singleSearch.afterResults.length > 0
                                    ? `${singleSearch.afterResults.length} dokumen teratas dari query yang diperluas.`
                                    : "Hasil ekspansi akan muncul setelah dokumen relevan dipilih."
                            }
                            results={singleSearch.afterResults}
                            selectedIndex={selectedAfterResultIndex}
                            onSelect={(index) => {
                                setSelectedAfterResultIndex(index);
                                setSelectedSinglePhase("after");
                            }}
                        />
                    </div>

                    <DocumentDetail
                        result={selectedSingleResult}
                        rank={selectedSingleRank}
                        phaseLabel={selectedSinglePhase === "before" ? "Sebelum ekspansi" : "Setelah ekspansi"}
                    />
                </div>
            )}

            {searchMode === "batch" && batchSearchResults.length > 0 && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold tracking-tight">Hasil Pencarian Batch</h3>
                            <p className="text-sm text-gray-600">
                                {batchSearchResults.length} query diproses. MAP sebelum ekspansi: {formatMetric(batchPass1MAP)}. MAP setelah ekspansi: {formatMetric(batchPass2MAP)}.
                            </p>
                            {!uploadedBatchRelevanceFeedbackFile && (
                                <p className="text-sm text-amber-700">
                                    Tanpa qrels, MAP tidak dihitung dan feedback batch memakai pseudo relevance feedback dari dokumen peringkat teratas.
                                </p>
                            )}
                        </div>

                        <Button type="button" className="px-6" onClick={handleBatchDownload}>
                            Unduh Hasil Before/After
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-base font-semibold tracking-tight">Daftar Query</h4>
                        <div className="grid gap-3 lg:grid-cols-2">
                            {batchSearchResults.map((queryResult, index) => {
                                const isSelected = selectedBatchQueryIndex === index;

                                return (
                                    <button
                                        key={queryResult.queryId}
                                        type="button"
                                        onClick={() => {
                                            setSelectedBatchQueryIndex(index);
                                            setSelectedBatchPhase("before");
                                            setSelectedBatchResultIndex(queryResult.beforeResults.length > 0 ? 0 : null);
                                        }}
                                        className={`rounded-xl border p-4 text-left transition ${
                                            isSelected
                                                ? "border-blue-400 bg-blue-50"
                                                : "border-gray-200 bg-white hover:border-blue-300"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-500">Query {queryResult.queryId}</p>
                                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-700">{queryResult.queryText}</p>
                                            </div>

                                            <div className="shrink-0 space-y-1 text-right text-sm font-semibold text-gray-700">
                                                <div className="rounded-md bg-gray-100 px-3 py-1">AP awal {formatMetric(queryResult.pass1AP)}</div>
                                                <div className="rounded-md bg-gray-100 px-3 py-1">AP ekspansi {formatMetric(queryResult.pass2AP)}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {selectedBatchQuery && (
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-base font-semibold tracking-tight">Ranking Query {selectedBatchQuery.queryId}</h4>
                                <p className="text-sm text-gray-600">
                                    Dokumen relevan pada qrels: {selectedBatchQuery.relevantDocumentCount}. Feedback relevan: {selectedBatchQuery.feedbackRelevantDocumentIds.length}. Feedback nonrelevan: {selectedBatchQuery.feedbackNonRelevantDocumentIds.length}.
                                </p>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <WeightTable title="Bobot Query Awal" vector={selectedBatchQuery.originalQuery} />
                                <WeightTable title="Bobot Query Setelah Ekspansi" vector={selectedBatchQuery.updatedQuery} />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                    <p className="text-sm font-semibold text-emerald-800">
                                        Dokumen feedback relevan
                                    </p>
                                    <p className="mt-1 text-sm text-emerald-900">
                                        {formatDocumentIds(selectedBatchQuery.feedbackRelevantDocumentIds)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="text-sm font-semibold text-amber-800">
                                        Dokumen feedback nonrelevan
                                    </p>
                                    <p className="mt-1 text-sm text-amber-900">
                                        {formatDocumentIds(selectedBatchQuery.feedbackNonRelevantDocumentIds)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-2">
                                <ResultsColumn
                                    title="Sebelum Query Expansion"
                                    description={`AP: ${formatMetric(selectedBatchQuery.pass1AP)}.`}
                                    results={selectedBatchQuery.beforeResults}
                                    selectedIndex={selectedBatchPhase === "before" ? selectedBatchResultIndex : null}
                                    onSelect={(index) => {
                                        setSelectedBatchPhase("before");
                                        setSelectedBatchResultIndex(index);
                                    }}
                                />

                                <ResultsColumn
                                    title="Setelah Query Expansion"
                                    description={`AP: ${formatMetric(selectedBatchQuery.pass2AP)}.`}
                                    results={selectedBatchQuery.afterResults}
                                    selectedIndex={selectedBatchPhase === "after" ? selectedBatchResultIndex : null}
                                    onSelect={(index) => {
                                        setSelectedBatchPhase("after");
                                        setSelectedBatchResultIndex(index);
                                    }}
                                />
                            </div>

                            <DocumentDetail
                                result={selectedBatchResult}
                                rank={selectedBatchRank}
                                phaseLabel={selectedBatchPhase === "before" ? "Sebelum ekspansi" : "Setelah ekspansi"}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
