import type { IREngine } from "@/features/engine/ir-engine";
import type { DocumentType } from "@/types/document-collections";
import type { SparseVectorType } from "@/types/document-vectors";
import type { BatchSearchResultType, SearchResultType } from "@/types/ir-engine";
import type { SearchResult } from "@/types/search-engine";
import type { SystemSettingsType } from "@/types/system-settings";

export function createDocumentProcessingSettingsSignature(settings: SystemSettingsType) {
    return JSON.stringify({
        stemWords: settings.stemWords,
        eliminateStopWords: settings.eliminateStopWords,
        documentTermFrequency: settings.documentTermFrequency,
        documentInverseDocumentFrequency: settings.documentInverseDocumentFrequency,
        documentNormalization: settings.documentNormalization,
    });
}

export function mapSearchResultsWithDocuments(
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

export function getDocumentsById(irEngine: IREngine) {
    return new Map(
        irEngine.documentsCollection?.documents.map((document) => [document.id, document]) ?? []
    );
}

export function formatMetric(value: number | null) {
    return value === null ? "N/A" : value.toFixed(4);
}

export function formatWeight(value: number) {
    if (Math.abs(value) >= 100) {
        return value.toFixed(2);
    }

    if (Math.abs(value) >= 1) {
        return value.toFixed(4);
    }

    return value.toPrecision(4);
}

export function getVectorEntries(vector: SparseVectorType, limit?: number) {
    const entries = Object.entries(vector)
        .filter(([, weight]) => Number.isFinite(weight) && weight !== 0)
        .sort((a, b) => b[1] - a[1]);

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

export function formatDocumentIds(documentIds: string[]) {
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

export function buildBatchResultsOutput(batchResult: BatchSearchResultType) {
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
