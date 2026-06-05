import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import type { DocumentType } from "@/types/document-collections";
import type { DocumentVectorsType } from "@/types/document-vectors";
import type { InvertedIndexType } from "@/types/inverted-index";
import type {
    DocumentTermEntry,
    InvertedIndexInspectorProps,
    PostingDisplayEntry,
} from "@/types/inverted-index-inspector";

import { formatWeight } from "./utils";

const EMPTY_INVERTED_INDEX: InvertedIndexType = {};
const EMPTY_DOCUMENT_VECTORS: DocumentVectorsType = {};

function sortDocumentsByNumericId(documentA: DocumentType, documentB: DocumentType) {
    return Number(documentA.id) - Number(documentB.id);
}

function sortTermsByName(termA: DocumentTermEntry, termB: DocumentTermEntry) {
    return termA.term.localeCompare(termB.term);
}

export function InvertedIndexDialog({ snapshot, isEnabled }: InvertedIndexInspectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [requestedDocumentId, setRequestedDocumentId] = useState<string | null>(null);
    const [requestedTerm, setRequestedTerm] = useState<string | null>(null);

    const documents = useMemo(
        () => [...(snapshot?.documents ?? [])].sort(sortDocumentsByNumericId),
        [snapshot]
    );
    const documentsById = useMemo(
        () => new Map(documents.map((document) => [document.id, document])),
        [documents]
    );
    const invertedIndex = snapshot?.invertedIndex ?? EMPTY_INVERTED_INDEX;
    const documentVectors = snapshot?.documentVectors ?? EMPTY_DOCUMENT_VECTORS;
    const canInspect = isEnabled && documents.length > 0 && Object.keys(invertedIndex).length > 0;
    const selectedDocumentId = requestedDocumentId && documentsById.has(requestedDocumentId)
        ? requestedDocumentId
        : documents[0]?.id ?? null;
    const selectedDocument = selectedDocumentId ? documentsById.get(selectedDocumentId) ?? null : null;

    const documentTerms = useMemo<DocumentTermEntry[]>(() => {
        if (!selectedDocumentId) return [];

        return Object.entries(invertedIndex)
            .flatMap(([term, postingList]) => {
                const posting = postingList.find((entry) => entry.documentId === selectedDocumentId);

                if (!posting) return [];

                return [{
                    term,
                    termFrequency: posting.termFrequency,
                    weight: documentVectors[selectedDocumentId]?.[term] ?? null,
                }];
            })
            .sort(sortTermsByName);
    }, [documentVectors, invertedIndex, selectedDocumentId]);
    const selectedTerm = requestedTerm && documentTerms.some((entry) => entry.term === requestedTerm)
        ? requestedTerm
        : documentTerms[0]?.term ?? null;

    const postingEntries = useMemo<PostingDisplayEntry[]>(() => {
        if (!selectedTerm) return [];

        return (invertedIndex[selectedTerm] ?? [])
            .map((posting) => {
                const document = documentsById.get(posting.documentId);

                return {
                    documentId: posting.documentId,
                    title: document?.title || null,
                    author: document?.author || null,
                    termFrequency: posting.termFrequency,
                    weight: documentVectors[posting.documentId]?.[selectedTerm] ?? null,
                };
            })
            .sort((postingA, postingB) => Number(postingA.documentId) - Number(postingB.documentId));
    }, [documentVectors, documentsById, invertedIndex, selectedTerm]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" disabled={!canInspect}>
                    Lihat Inverted Index
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-[min(96vw,82rem)]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Inverted File / Index</DialogTitle>
                    <DialogDescription>
                        Pilih dokumen untuk melihat term hasil preprocessing, lalu pilih term untuk melihat inverted file/index-nya.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(12rem,18rem)_minmax(14rem,22rem)_minmax(0,1fr)]">
                    <section className="min-h-0 rounded-xl border border-gray-200 bg-white p-3">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-gray-900">Dokumen</h3>
                            <p className="text-xs text-gray-600">{documents.length} dokumen terindeks</p>
                        </div>

                        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                            {documents.map((document) => {
                                const isSelected = selectedDocumentId === document.id;

                                return (
                                    <button
                                        key={document.id}
                                        type="button"
                                        onClick={() => {
                                            setRequestedDocumentId(document.id);
                                            setRequestedTerm(null);
                                        }}
                                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                                            isSelected
                                                ? "border-blue-400 bg-blue-50"
                                                : "border-gray-200 bg-white hover:border-blue-300"
                                        }`}
                                    >
                                        <p className="text-sm font-semibold text-gray-900">Dokumen {document.id}</p>
                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                                            {document.title || "Tanpa judul"}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="min-h-0 rounded-xl border border-gray-200 bg-white p-3">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-gray-900">
                                Term Dokumen {selectedDocument?.id ?? "-"}
                            </h3>
                            <p className="text-xs text-gray-600">{documentTerms.length} term ditemukan</p>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-100">
                            {documentTerms.map((entry) => {
                                const isSelected = selectedTerm === entry.term;

                                return (
                                    <button
                                        key={entry.term}
                                        type="button"
                                        onClick={() => setRequestedTerm(entry.term)}
                                        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 ${
                                            isSelected ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                                        }`}
                                    >
                                        <span className="truncate text-gray-900">{entry.term}</span>
                                        <span className="text-xs text-gray-600">
                                            tf {entry.termFrequency}
                                            {entry.weight !== null ? ` | w ${formatWeight(entry.weight)}` : ""}
                                        </span>
                                    </button>
                                );
                            })}

                            {documentTerms.length === 0 && (
                                <p className="px-3 py-4 text-sm text-gray-600">
                                    Dokumen ini tidak memiliki term terindeks.
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="min-h-0 rounded-xl border border-gray-200 bg-white p-3">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-gray-900">
                                Inverted File/Index untuk Term {selectedTerm ? `"${selectedTerm}"` : ""}
                            </h3>
                            <p className="text-xs text-gray-600">{postingEntries.length} dokumen memuat term ini</p>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-100">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-600">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">Dokumen</th>
                                        <th className="px-3 py-2 font-semibold">Judul</th>
                                        <th className="px-3 py-2 text-right font-semibold">TF</th>
                                        <th className="px-3 py-2 text-right font-semibold">Bobot</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {postingEntries.map((posting) => (
                                        <tr key={posting.documentId} className="border-b border-gray-100 last:border-b-0">
                                            <td className="px-3 py-2 font-semibold text-gray-900">
                                                {posting.documentId}
                                            </td>
                                            <td className="max-w-0 px-3 py-2">
                                                <p className="truncate text-gray-700">{posting.title || "Tanpa judul"}</p>
                                                {posting.author && (
                                                    <p className="truncate text-xs text-gray-500">{posting.author}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-700">
                                                {posting.termFrequency}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-700">
                                                {posting.weight !== null ? formatWeight(posting.weight) : "N/A"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {postingEntries.length === 0 && (
                                <p className="px-3 py-4 text-sm text-gray-600">
                                    Pilih term untuk melihat inverted file.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}
