import { useEffect, useRef, useState } from "react"
import type { ChangeEvent, RefObject } from "react";

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { IREngine } from "@/features/engine/ir-engine"

import type { DocumentType } from "@/types/document-collections"
import type { SystemSettingsType } from "@/types/system-settings"

type SearchEngineProps = {
    irEngineRef: RefObject<IREngine>
    systemSettings: SystemSettingsType
    searchQuery: string
    setSearchQuery: (query: string) => void
}

type SearchResult = {
    documentId: string
    score: number
    document: DocumentType | null
}

export function SearchEngine({ irEngineRef, systemSettings, searchQuery, setSearchQuery }: SearchEngineProps) {
    const [uploadedDocumentCollectionFile, setUploadedDocumentCollectionFile] = useState<File | null>(null)
    const [uploadedBatchQueryFile, setUploadedBatchQueryFile] = useState<File | null>(null)
    const [uploadedBatchRelevanceFeedbackFile, setUploadedBatchRelevanceFeedbackFile] = useState<File | null>(null)
    const [searchMode, setSearchMode] = useState<"single" | "batch">("single")
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [searchError, setSearchError] = useState<string | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null)
    const [isProcessingDocumentCollection, setIsProcessingDocumentCollection] = useState(false)
    const [documentCollectionStatus, setDocumentCollectionStatus] = useState<"idle" | "processing" | "done" | "error">("idle")
    const [processedDocumentsCount, setProcessedDocumentsCount] = useState<number | null>(null)
    const [lastExecutedQuery, setLastExecutedQuery] = useState("")
    const [resultsListHeight, setResultsListHeight] = useState<number | null>(null)
    const resultsListRef = useRef<HTMLDivElement | null>(null)
    const processingRequestIdRef = useRef(0)

    useEffect(() => {
        const resultsListElement = resultsListRef.current

        if (!resultsListElement) {
            setResultsListHeight(null)
            return
        }

        const updateResultsListHeight = () => {
            setResultsListHeight(resultsListElement.getBoundingClientRect().height)
        }

        updateResultsListHeight()

        if (typeof ResizeObserver === "undefined") return

        const resizeObserver = new ResizeObserver(() => {
            updateResultsListHeight()
        })

        resizeObserver.observe(resultsListElement)

        return () => {
            resizeObserver.disconnect()
        }
    }, [searchResults])

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>, fileType: "documentCollection" | "batchQuery" | "batchRelevanceFeedback") {
        const file = event.target.files?.[0];
        if (!file) return;

        switch (fileType) {
            case "documentCollection": {
                processingRequestIdRef.current += 1
                const processingRequestId = processingRequestIdRef.current

                setSearchError(null);
                setUploadedDocumentCollectionFile(file);
                setSearchResults([])
                setSelectedResultIndex(null)
                setLastExecutedQuery("")
                setProcessedDocumentsCount(null)
                setDocumentCollectionStatus("processing")
                setIsProcessingDocumentCollection(true)

                try {
                    const irEngine = irEngineRef.current
                    await irEngine.processDocumentCollection(file, systemSettings)

                    if (processingRequestId !== processingRequestIdRef.current) return

                    setProcessedDocumentsCount(irEngine.documentsCollection?.documents.length ?? 0)
                    setDocumentCollectionStatus("done")
                } catch (error) {
                    if (processingRequestId !== processingRequestIdRef.current) return

                    setDocumentCollectionStatus("error")
                    setSearchError(error instanceof Error ? error.message : "Terjadi kesalahan saat memproses koleksi dokumen.")
                } finally {
                    if (processingRequestId === processingRequestIdRef.current) {
                        setIsProcessingDocumentCollection(false)
                    }
                }
                break;
            }
            case "batchQuery":
                setUploadedBatchQueryFile(file);
                break;
            case "batchRelevanceFeedback":
                setUploadedBatchRelevanceFeedbackFile(file);
                break;
        }
    }

    async function handleSearch() {
        setSearchError(null)
        setSearchResults([])
        setSelectedResultIndex(null)
        setLastExecutedQuery("")

        if (searchMode !== "single") {
            setSearchError("Mode batch belum diimplementasikan. Gunakan mode single untuk pencarian.")
            return
        }

        if (!uploadedDocumentCollectionFile) {
            setSearchError("Unggah koleksi dokumen terlebih dahulu.")
            return
        }

        const normalizedQuery = searchQuery.trim()

        if (!normalizedQuery) {
            setSearchError("Masukkan query pencarian terlebih dahulu.")
            return
        }

        if (isProcessingDocumentCollection) {
            setSearchError("Koleksi dokumen sedang diproses. Tunggu hingga selesai.")
            return
        }

        if (documentCollectionStatus !== "done") {
            setSearchError("Koleksi dokumen belum siap. Silakan unggah dan tunggu proses selesai.")
            return
        }

        setIsSearching(true)

        try {
            const irEngine = irEngineRef.current

            const results = irEngine.search(
                normalizedQuery,
                systemSettings.topKRetrievedDocuments
            )

            const documentsById = new Map(
                irEngine.documentsCollection?.documents.map((document) => [document.id, document]) ?? []
            )

            const mappedResults = results.map((result) => ({
                ...result,
                document: documentsById.get(result.documentId) ?? null,
            }))

            setSearchResults(mappedResults)
            setSelectedResultIndex(mappedResults.length > 0 ? 0 : null)
            setLastExecutedQuery(normalizedQuery)
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : "Terjadi kesalahan saat melakukan pencarian.")
        } finally {
            setIsSearching(false)
        }

    }
    const selectedResult =
        selectedResultIndex !== null ? (searchResults[selectedResultIndex] ?? null) : null

    return (
        <div className="rounded-xl border-2 border-gray-300 p-6 md:p-8 space-y-8">
            <h2 className="text-2xl font-semibold tracking-tight">Search Engine</h2>

            <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">Unggah Koleksi Dokumen</h3>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                        type="file"
                        onClick={(event) => {
                            event.currentTarget.value = ""
                        }}
                        onChange={(e) => void handleFileChange(e, "documentCollection")}
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
                        <RadioGroupItem value="single"/> 
                        <Label className="text-base leading-none">Single</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="batch"/> 
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
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full max-w-4xl text-sm"
                    />
                </div>
            )}

            {searchMode === "batch" && (
                <div className="flex flex-col gap-8 xl:flex-row xl:gap-10">
                    <div className="flex flex-col space-y-2 w-full max-w-md">
                        <h3 className="text-lg font-semibold tracking-tight">Unggah File Query Batch</h3>
                        <Input
                            type="file"
                            onChange={(e) => void handleFileChange(e, "batchQuery")}
                            className="block w-full max-w-sm text-sm"
                        />
                        {uploadedBatchQueryFile && (
                            <p className="text-sm text-gray-600">
                                File terpilih: {uploadedBatchQueryFile.name}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col space-y-2 w-full max-w-md">
                        <h3 className="text-lg font-semibold tracking-tight">Unggah File Relevance Feedback Batch</h3>
                        <Input
                            type="file"
                            onChange={(e) => void handleFileChange(e, "batchRelevanceFeedback")}
                            className="block w-full max-w-sm text-sm"
                        />
                        {uploadedBatchRelevanceFeedbackFile && (
                            <p className="text-sm text-gray-600">
                                File terpilih: {uploadedBatchRelevanceFeedbackFile.name}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <Button className="p-6 text-lg" onClick={handleSearch} disabled={isSearching || isProcessingDocumentCollection}>
                {isSearching ? "Memproses..." : "Jalankan Pencarian"}
            </Button>

            {searchError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {searchError}
                </p>
            )}

            {searchResults.length > 0 && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight">Hasil Pencarian</h3>
                        <p className="text-sm text-gray-600">
                            Menampilkan {searchResults.length} dokumen teratas untuk query "{lastExecutedQuery}".
                        </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div ref={resultsListRef} className="space-y-3">
                            {searchResults.map((result, index) => {
                                const isSelected = selectedResultIndex === index

                                return (
                                    <button
                                        key={`${result.documentId}-${index}`}
                                        type="button"
                                        onClick={() => setSelectedResultIndex(index)}
                                        className={`w-full rounded-lg border p-4 text-left transition ${isSelected
                                            ? "border-blue-400 bg-blue-50"
                                            : "border-gray-200 bg-white hover:border-blue-300"
                                            }`}
                                    >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-500">
                                                    Rank {index + 1} - Dokumen {result.documentId}
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

                                        {result.document?.content && (
                                            <p className="mt-3 line-clamp-1 text-sm leading-6 text-gray-700">
                                                {result.document.content}
                                            </p>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        <div
                            className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 p-4"
                            style={resultsListHeight ? { height: `${resultsListHeight}px` } : undefined}
                        >
                            {selectedResult ? (
                                <div className="flex min-h-0 flex-1 flex-col gap-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-500">
                                                Rank {(selectedResultIndex ?? 0) + 1} - Dokumen {selectedResult.documentId}
                                            </p>
                                            <h4 className="text-base font-semibold">
                                                {selectedResult.document?.title || "Tanpa judul"}
                                            </h4>
                                        </div>

                                        <div className="shrink-0 rounded-md bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                                            Skor {selectedResult.score.toFixed(4)}
                                        </div>
                                    </div>

                                    {selectedResult.document?.author && (
                                        <p className="text-sm text-gray-600">
                                            {selectedResult.document.author}
                                        </p>
                                    )}

                                    <div className="min-h-0 flex-1 overflow-y-auto rounded-md bg-gray-50 p-3">
                                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                            {selectedResult.document?.content || "Konten dokumen tidak tersedia."}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    Pilih dokumen di sisi kiri untuk melihat konten lengkap.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
