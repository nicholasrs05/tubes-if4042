import { useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { DocumentDetail } from "@/components/search-engine/document-detail";
import { ExpansionTermSelector } from "@/components/search-engine/expansion-term-selector";
import { InvertedIndexDialog } from "@/components/search-engine/inverted-index-dialog";
import { ResultsColumn } from "@/components/search-engine/results-column";
import { WeightTable } from "@/components/search-engine/weight-table";
import {
    buildBatchResultsOutput,
    createDocumentProcessingSettingsSignature,
    formatDocumentIds,
    formatMetric,
    getVectorEntries,
    mapSearchResultsWithDocuments,
} from "@/components/search-engine/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DEFAULT_EXPANSION_TERMS_COUNT } from "@/features/engine/ir-engine";
import type { SparseVectorType } from "@/types/document-vectors";
import type { InvertedIndexSnapshot } from "@/types/inverted-index-inspector";
import type {
    BatchQueryResult,
    DocumentCollectionStatus,
    ResultPhase,
    SearchEngineProps,
    SearchInputFileType,
    SearchMode,
    SingleSearchState,
} from "@/types/search-engine";

export function SearchEngine({ irEngineRef, systemSettings, searchQuery, setSearchQuery }: SearchEngineProps) {
    const [uploadedDocumentCollectionFile, setUploadedDocumentCollectionFile] = useState<File | null>(null);
    const [uploadedBatchQueryFile, setUploadedBatchQueryFile] = useState<File | null>(null);
    const [uploadedBatchRelevanceFeedbackFile, setUploadedBatchRelevanceFeedbackFile] = useState<File | null>(null);
    const [searchMode, setSearchMode] = useState<SearchMode>("single");
    const [singleSearch, setSingleSearch] = useState<SingleSearchState | null>(null);
    const [selectedRelevantDocumentIds, setSelectedRelevantDocumentIds] = useState<string[]>([]);
    const [singleExpansionTermWeights, setSingleExpansionTermWeights] = useState<SparseVectorType | null>(null);
    const [selectedExpansionTerms, setSelectedExpansionTerms] = useState<string[]>([]);
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
    const [documentCollectionStatus, setDocumentCollectionStatus] = useState<DocumentCollectionStatus>("idle");
    const [processedDocumentsCount, setProcessedDocumentsCount] = useState<number | null>(null);
    const [processedDocumentSettingsSignature, setProcessedDocumentSettingsSignature] = useState<string | null>(null);
    const [invertedIndexSnapshot, setInvertedIndexSnapshot] = useState<InvertedIndexSnapshot | null>(null);
    const processingRequestIdRef = useRef(0);

    function clearSearchOutputs() {
        setSingleSearch(null);
        setSelectedRelevantDocumentIds([]);
        setSingleExpansionTermWeights(null);
        setSelectedExpansionTerms([]);
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

    function clearSingleExpansionOutputs() {
        setSingleExpansionTermWeights(null);
        setSelectedExpansionTerms([]);
        setSelectedAfterResultIndex(null);
        setSelectedSinglePhase("before");
        setSingleSearch((previousSearch) => previousSearch
            ? {
                ...previousSearch,
                updatedQuery: null,
                afterResults: [],
                feedbackRelevantDocumentIds: [],
                feedbackNonRelevantDocumentIds: [],
            }
            : previousSearch
        );
    }

    async function processDocumentCollection(file: File, shouldClearOutputs: boolean) {
        processingRequestIdRef.current += 1;
        const processingRequestId = processingRequestIdRef.current;
        const settingsSignature = createDocumentProcessingSettingsSignature(systemSettings);

        setSearchError(null);
        setDocumentCollectionStatus("processing");
        setIsProcessingDocumentCollection(true);
        setInvertedIndexSnapshot(null);

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
            setInvertedIndexSnapshot({
                documents: irEngine.documentsCollection?.documents ?? [],
                invertedIndex: irEngine.invertedIndex ?? {},
                documentVectors: irEngine.documentVectors ?? {},
            });
            setProcessedDocumentSettingsSignature(settingsSignature);
            setDocumentCollectionStatus("done");
            return true;
        } catch (error) {
            if (processingRequestId !== processingRequestIdRef.current) {
                return false;
            }

            setProcessedDocumentSettingsSignature(null);
            setInvertedIndexSnapshot(null);
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
        fileType: SearchInputFileType
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
            const documentsById = irEngine.documentsById;

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
        clearSingleExpansionOutputs();
    }

    function handleSelectAllBeforeResultsAsRelevant() {
        if (!singleSearch) return;

        setSelectedRelevantDocumentIds(singleSearch.beforeResults.map((result) => result.documentId));
        clearSingleExpansionOutputs();
    }

    function handleClearRelevantDocuments() {
        setSelectedRelevantDocumentIds([]);
        clearSingleExpansionOutputs();
    }

    function getSingleFeedbackDocumentIds(search: SingleSearchState, relevantDocumentIds: string[]) {
        const relevantSet = new Set(relevantDocumentIds);
        const nonRelevantDocumentIds = search.beforeResults
            .map((result) => result.documentId)
            .filter((documentId) => !relevantSet.has(documentId));

        return {
            relevantDocumentIds,
            nonRelevantDocumentIds,
        };
    }

    async function handleComputeSingleExpansionTerms() {
        setSearchError(null);

        if (!singleSearch) {
            setSearchError("Jalankan pencarian awal terlebih dahulu.");
            return;
        }

        if (selectedRelevantDocumentIds.length === 0) {
            setSearchError("Pilih minimal satu dokumen relevan sebelum menghitung kandidat term.");
            return;
        }

        setIsSearching(true);

        try {
            const collectionReady = await ensureDocumentCollectionReady();
            if (!collectionReady) return;

            const irEngine = irEngineRef.current;
            const { relevantDocumentIds, nonRelevantDocumentIds } = getSingleFeedbackDocumentIds(
                singleSearch,
                selectedRelevantDocumentIds
            );
            const expansionTermWeights = irEngine.computeExpansionTermWeights(
                singleSearch.originalQuery,
                relevantDocumentIds,
                nonRelevantDocumentIds
            );
            const defaultSelectedTerms = getVectorEntries(expansionTermWeights).entries
                .slice(0, DEFAULT_EXPANSION_TERMS_COUNT)
                .map(([term]) => term);

            setSingleExpansionTermWeights(expansionTermWeights);
            setSelectedExpansionTerms(defaultSelectedTerms);
            setSelectedAfterResultIndex(null);
            setSelectedSinglePhase("before");
            setSingleSearch({
                ...singleSearch,
                updatedQuery: null,
                afterResults: [],
                feedbackRelevantDocumentIds: relevantDocumentIds,
                feedbackNonRelevantDocumentIds: nonRelevantDocumentIds,
            });
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : "Terjadi kesalahan saat menghitung kandidat term ekspansi.");
        } finally {
            setIsSearching(false);
        }
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

        if (!singleExpansionTermWeights) {
            setSearchError("Hitung bobot kandidat term terlebih dahulu sebelum melakukan query expansion.");
            return;
        }

        if (selectedExpansionTerms.length === 0) {
            setSearchError("Pilih minimal satu kandidat term untuk query expansion.");
            return;
        }

        const topK = getValidTopK();
        if (topK === null) return;

        setIsSearching(true);

        try {
            const collectionReady = await ensureDocumentCollectionReady();
            if (!collectionReady) return;

            const irEngine = irEngineRef.current;
            const documentsById = irEngine.documentsById;
            const { relevantDocumentIds, nonRelevantDocumentIds } = getSingleFeedbackDocumentIds(
                singleSearch,
                selectedRelevantDocumentIds
            );
            const expandedSearch = irEngine.expandSearchWithFeedback(
                singleSearch.originalQuery,
                singleSearch.beforeResults,
                topK,
                relevantDocumentIds,
                nonRelevantDocumentIds,
                selectedExpansionTerms
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

    function clearSingleExpandedResults() {
        setSelectedAfterResultIndex(null);
        setSelectedSinglePhase("before");
        setSingleSearch((previousSearch) => previousSearch
            ? {
                ...previousSearch,
                updatedQuery: null,
                afterResults: [],
            }
            : previousSearch
        );
    }

    function toggleExpansionTerm(term: string) {
        setSelectedExpansionTerms((previousTerms) => (
            previousTerms.includes(term)
                ? previousTerms.filter((selectedTerm) => selectedTerm !== term)
                : [...previousTerms, term]
        ));
        clearSingleExpandedResults();
    }

    function selectTopExpansionTerms() {
        if (!singleExpansionTermWeights) return;

        setSelectedExpansionTerms(
            getVectorEntries(singleExpansionTermWeights).entries
                .slice(0, DEFAULT_EXPANSION_TERMS_COUNT)
                .map(([term]) => term)
        );
        clearSingleExpandedResults();
    }

    function selectAllExpansionTerms() {
        if (!singleExpansionTermWeights) return;

        setSelectedExpansionTerms(
            getVectorEntries(singleExpansionTermWeights).entries.map(([term]) => term)
        );
        clearSingleExpandedResults();
    }

    function clearExpansionTerms() {
        setSelectedExpansionTerms([]);
        clearSingleExpandedResults();
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
        <div className="search-workbench rounded-[1.75rem] p-6 md:p-8 space-y-8">
            <div>
                <h2 className="text-3xl font-black tracking-[-0.04em]">Search Engine</h2>
            </div>

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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <p className="text-sm text-gray-600">
                            File terpilih: {uploadedDocumentCollectionFile.name}
                        </p>

                        {documentCollectionStatus === "done" && (
                            <InvertedIndexDialog
                                snapshot={invertedIndexSnapshot}
                                isEnabled={Boolean(invertedIndexSnapshot)}
                            />
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">Mode Pencarian</h3>

                <RadioGroup
                    className="flex flex-col gap-4 lg:flex-row lg:gap-10"
                    value={searchMode}
                    onValueChange={(value) => setSearchMode(value as SearchMode)}
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
                        Alur Penggunaan: jalankan pencarian awal, pilih dokumen relevan, pilih term ekspansi, lalu tampilkan hasil setelah ekspansi.
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
                                    Ranking awal untuk query "{singleSearch.queryText}". Centang dokumen relevan, lalu hitung kandidat term untuk dipilih sebelum query expansion.
                                </p>
                                <p className="text-sm text-gray-700">
                                    Relevan dipilih: {selectedRelevantDocumentIds.length}. Nonrelevan tersirat: {Math.max(singleSearch.beforeResults.length - selectedRelevantDocumentIds.length, 0)}.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button type="button" variant="outline" onClick={handleSelectAllBeforeResultsAsRelevant}>
                                    Tandai Semua Relevan
                                </Button>
                                <Button type="button" variant="outline" onClick={handleClearRelevantDocuments}>
                                    Kosongkan Pilihan
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => void handleComputeSingleExpansionTerms()}
                                    disabled={isSearching || selectedRelevantDocumentIds.length === 0}
                                >
                                    Hitung Bobot Term
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <WeightTable
                            title="Bobot Query Awal"
                            vector={singleSearch.originalQuery}
                            className="max-h-80"
                        />
                        <WeightTable
                            title="Bobot Query Setelah Ekspansi"
                            vector={singleSearch.updatedQuery ?? {}}
                            className="max-h-80"
                        />
                    </div>

                    {singleExpansionTermWeights && (
                        <ExpansionTermSelector
                            termWeights={singleExpansionTermWeights}
                            selectedTerms={selectedExpansionTerms}
                            onToggleTerm={toggleExpansionTerm}
                            onSelectTopTerms={selectTopExpansionTerms}
                            onSelectAllTerms={selectAllExpansionTerms}
                            onClearTerms={clearExpansionTerms}
                            onExpand={() => void handleExpandSingleQuery()}
                            isExpanding={isSearching}
                        />
                    )}

                    {singleSearch.updatedQuery && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-stone-300 bg-stone-50 p-4">
                                <p className="text-sm font-semibold text-stone-800">
                                    Dokumen feedback relevan
                                </p>
                                <p className="mt-1 text-sm text-stone-700">
                                    {formatDocumentIds(singleSearch.feedbackRelevantDocumentIds)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-stone-300 bg-stone-50 p-4">
                                <p className="text-sm font-semibold text-stone-800">
                                    Dokumen feedback nonrelevan
                                </p>
                                <p className="mt-1 text-sm text-stone-700">
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
                            Unduh Hasil
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-base font-semibold tracking-tight">Daftar Query</h4>
                        <div className="max-h-[28rem] overflow-y-auto pr-1">
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
                                <WeightTable
                                    title="Bobot Query Awal"
                                    vector={selectedBatchQuery.originalQuery}
                                    className="max-h-80"
                                />
                                <WeightTable
                                    title="Bobot Query Setelah Ekspansi"
                                    vector={selectedBatchQuery.updatedQuery}
                                    className="max-h-80"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl border border-stone-300 bg-stone-50 p-4">
                                    <p className="text-sm font-semibold text-stone-800">
                                        Dokumen feedback relevan
                                    </p>
                                    <p className="mt-1 text-sm text-stone-700">
                                        {formatDocumentIds(selectedBatchQuery.feedbackRelevantDocumentIds)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-stone-300 bg-stone-50 p-4">
                                    <p className="text-sm font-semibold text-stone-800">
                                        Dokumen feedback nonrelevan
                                    </p>
                                    <p className="mt-1 text-sm text-stone-700">
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

