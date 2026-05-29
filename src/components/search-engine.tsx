import { useState } from "react"
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

    function handleFileChange(event: ChangeEvent<HTMLInputElement>, fileType: "documentCollection" | "batchQuery" | "batchRelevanceFeedback") {
        const file = event.target.files?.[0];
        if (!file) return;

        switch (fileType) {
            case "documentCollection":
                setUploadedDocumentCollectionFile(file);
                break;
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

        setIsSearching(true)

        try {
            const irEngine = irEngineRef.current

            await irEngine.processDocumentCollection(uploadedDocumentCollectionFile, systemSettings)

            const results = irEngine.search(
                normalizedQuery,
                systemSettings.topKRetrievedDocuments
            )

            const documentsById = new Map(
                irEngine.documentsCollection?.documents.map((document) => [document.id, document]) ?? []
            )

            setSearchResults(
                results.map((result) => ({
                    ...result,
                    document: documentsById.get(result.documentId) ?? null,
                }))
            )
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : "Terjadi kesalahan saat melakukan pencarian.")
        } finally {
            setIsSearching(false)
        }

    }

    return (
        <div className="rounded-xl border-2 border-gray-300 p-6 md:p-8 space-y-8">
            <h2 className="text-2xl font-semibold tracking-tight">Search Engine</h2>

            <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">Unggah Koleksi Dokumen</h3>
                
                <Input
                    type="file"
                    onChange={(e) => handleFileChange(e, "documentCollection")}
                    className="block w-full max-w-sm text-sm"
                />
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
                            onChange={(e) => handleFileChange(e, "batchQuery")}
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
                            onChange={(e) => handleFileChange(e, "batchRelevanceFeedback")}
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

            <Button className="p-6 text-lg" onClick={handleSearch} disabled={isSearching}>
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
                            Menampilkan {searchResults.length} dokumen teratas untuk query "{searchQuery.trim()}".
                        </p>
                    </div>

                    <div className="space-y-3">
                        {searchResults.map((result, index) => (
                            <article
                                key={`${result.documentId}-${index}`}
                                className="rounded-lg border border-gray-200 p-4"
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
                                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-700">
                                        {result.document.content}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
