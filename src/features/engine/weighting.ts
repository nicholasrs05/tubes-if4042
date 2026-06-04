import type { SystemSettingsType } from "@/types/system-settings";
import type { SparseVectorType } from "@/types/document-vectors";
import type { TermFrequencyVariant } from "@/types/weighting";

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
        return Object.fromEntries(
            Object.keys(rawTf).map((term) => [term, 1])
        );
    }

    if (termFrequencyVariant === "logarithmic") {
        return Object.fromEntries(
            Object.entries(rawTf).map(([term, tf]) => [
            term,
            1 + Math.log10(tf),
            ])
        );
    }

    if (termFrequencyVariant === "augmented") {
        const maxTf = Math.max(...Object.values(rawTf));

        return Object.fromEntries(
            Object.entries(rawTf).map(([term, tf]) => [
                term,
                0.5 + 0.5 * (tf / maxTf),
            ])
        );
    }

    return rawTf;
}

export function cosineSimilarity(
    vectorA: SparseVectorType,
    vectorB: SparseVectorType
): number {
    let dotProduct = 0;

    for (const [term, weightA] of Object.entries(vectorA)) {
        const weightB = vectorB[term] ?? 0;
        dotProduct += weightA * weightB;
    }

    const normA = vectorNorm(vectorA);
    const normB = vectorNorm(vectorB);

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
    const norm = Math.sqrt(
        Object.values(vector).reduce((sum, weight) => {
            return sum + weight ** 2;
        }, 0)
    );

    if (norm === 0) {
        return vector;
    }

    return Object.fromEntries(
        Object.entries(vector).map(([term, weight]) => [
            term,
            weight / norm,
        ])
    );
}
