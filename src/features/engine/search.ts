import type { DocumentVectorsType, SparseVectorType } from "@/types/document-vectors";
import { cosineSimilarity } from "./weighting";

export type RankedDocument = {
    documentId: string;
    score: number;
};

export function searchDocuments(
    queryVector: SparseVectorType,
    documentVectors: DocumentVectorsType,
    topK: number = 10
): RankedDocument[] {
    return Object.entries(documentVectors)
        .map(([documentId, documentVector]) => ({
            documentId,
            score: cosineSimilarity(queryVector, documentVector),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}
