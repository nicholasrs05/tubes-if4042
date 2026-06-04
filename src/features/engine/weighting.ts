import type { SystemSettingsType } from "@/types/system-settings";
import type { SparseVectorType } from "@/types/document-vectors";
import type { TermFrequencyVariant } from "@/types/weighting";
import type { InvertedIndexType } from "@/types/inverted-index";
import type { IDFType } from "@/types/idf";

export function computeRawTermFrequency(tokens: string[]): Record<string, number> {
    const termFrequency: Record<string, number> = {};

    for (const token of tokens) {
        termFrequency[token] = (termFrequency[token] ?? 0) + 1;
    }

    return termFrequency;
}

export function computeTermFrequency(
    tokens: string[],
    settings: SystemSettingsType,
    target: "query" | "document" = "document"
): Record<string, number> {
    const rawTf = computeRawTermFrequency(tokens);
    const termFrequencyVariant = (target === "query"
        ? settings.queryTermFrequency
        : settings.documentTermFrequency) as TermFrequencyVariant;

    if (termFrequencyVariant === "raw") {
        return rawTf;
    }

    if (termFrequencyVariant === "binary") {
        const binaryTf: Record<string, number> = {};
        for (const term in rawTf) {
            binaryTf[term] = 1;
        }
        return binaryTf;
    }

    if (termFrequencyVariant === "logarithmic") {
        const logTf: Record<string, number> = {};
        for (const term in rawTf) {
            logTf[term] = 1 + Math.log10(rawTf[term]);
        }
        return logTf;
    }

    if (termFrequencyVariant === "augmented") {
        let maxTf = 0;
        for (const term in rawTf) {
            if (rawTf[term] > maxTf) {
                maxTf = rawTf[term];
            }
        }

        const augmentedTf: Record<string, number> = {};
        for (const term in rawTf) {
            augmentedTf[term] = 0.5 + 0.5 * (rawTf[term] / maxTf);
        }

        return augmentedTf;
    }

    return rawTf;
}

export function computeIDF(
        invertedIndex: InvertedIndexType,
        totalDocuments: number
    ): IDFType {
        const idf: IDFType = {};

        for (const [term, postingList] of Object.entries(invertedIndex) as [string, InvertedIndexType[string]][]) {
            const documentFrequency = postingList.length;

            idf[term] = Math.log10(totalDocuments / documentFrequency);
        }

        return idf;
    }

export function cosineSimilarity(
    vectorA: SparseVectorType,
    vectorB: SparseVectorType,
    isANormalized: boolean = false,
    isBNormalized: boolean = false
): number {
    let dotProduct = 0;

    for (const [term, weightA] of Object.entries(vectorA)) {
        const weightB = vectorB[term] ?? 0;
        dotProduct += weightA * weightB;
    }

    if (isANormalized && isBNormalized) {
        return dotProduct;
    }

    const normA = isANormalized ? 1 : vectorNorm(vectorA);
    const normB = isBNormalized ? 1 : vectorNorm(vectorB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

export function vectorNorm(vector: SparseVectorType): number {
    return Math.sqrt(
        Object.values(vector).reduce((sum, weight) => sum + weight ** 2, 0)
    );
}

export function normalizeVector(vector: SparseVectorType): SparseVectorType {
    let sumOfSquares = 0;

    for (const term in vector) {
        sumOfSquares += vector[term] ** 2;
    }

    const norm = Math.sqrt(sumOfSquares);

    if (norm === 0) {
        return vector;
    }

    const normalizedVector: SparseVectorType = {};

    for (const term in vector) {
        normalizedVector[term] = vector[term] / norm;
    }

    return normalizedVector;
}
