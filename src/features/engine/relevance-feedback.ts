import type { SystemSettingsType } from "@/types/system-settings";
import type { SparseVectorType } from "@/types/document-vectors";

function createEmptyVector(): SparseVectorType {
    return {};
}

function getAllTerms(vectors: SparseVectorType[]): Set<string> {
    const terms = new Set<string>();

    for (const vector of vectors) {
        for (const term of Object.keys(vector)) {
            terms.add(term);
        }
    }

    return terms;
}

function sumVectors(vectors: SparseVectorType[]): SparseVectorType {
    if (vectors.length === 0) {
        return createEmptyVector();
    }

    const summedVector: SparseVectorType = {};

    for (const term of getAllTerms(vectors)) {
        summedVector[term] = vectors.reduce((sum, vector) => sum + (vector[term] ?? 0), 0);
    }

    return summedVector;
}

function averageVectors(vectors: SparseVectorType[]): SparseVectorType {
    if (vectors.length === 0) {
        return createEmptyVector();
    }

    const summedVector = sumVectors(vectors);

    return Object.fromEntries(
        Object.entries(summedVector).map(([term, weight]) => [
            term,
            weight / vectors.length,
        ])
    );
}

function clampPositiveVector(vector: SparseVectorType): SparseVectorType {
    return Object.fromEntries(
        Object.entries(vector)
            .map(([term, weight]) => [term, Math.max(0, weight)] as const)
    );
}

export function applyRocchio(
    queryVector: SparseVectorType,
    relevantVectors: SparseVectorType[],
    nonRelevantVectors: SparseVectorType[],
    settings: SystemSettingsType
): SparseVectorType {
    const alpha = 1;
    const beta = settings.rocchioBetaConstant;
    const gamma = settings.rocchioGammaConstant;
    const relevantCentroid = averageVectors(relevantVectors);
    const nonRelevantCentroid = averageVectors(nonRelevantVectors);
    const updatedQueryVector: SparseVectorType = {};

    const allTerms = getAllTerms([
        queryVector,
        relevantCentroid,
        nonRelevantCentroid,
    ]);

    for (const term of allTerms) {
        const queryWeight = queryVector[term] ?? 0;
        const relevantWeight = relevantCentroid[term] ?? 0;
        const nonRelevantWeight = nonRelevantCentroid[term] ?? 0;

        updatedQueryVector[term] = alpha * queryWeight + beta * relevantWeight - gamma * nonRelevantWeight;
    }

    return clampPositiveVector(updatedQueryVector);
}

export function applyIdeRegular(
    queryVector: SparseVectorType,
    relevantVectors: SparseVectorType[],
    nonRelevantVectors: SparseVectorType[],
): SparseVectorType {
    const relevantSum = sumVectors(relevantVectors);
    const nonRelevantSum = sumVectors(nonRelevantVectors);
    const updatedQueryVector: SparseVectorType = {};

    const allTerms = getAllTerms([
        queryVector,
        relevantSum,
        nonRelevantSum,
    ]);

    for (const term of allTerms) {
        const queryWeight = queryVector[term] ?? 0;
        const relevantWeight = relevantSum[term] ?? 0;
        const nonRelevantWeight = nonRelevantSum[term] ?? 0;

        updatedQueryVector[term] = queryWeight + relevantWeight - nonRelevantWeight;
    }

    return clampPositiveVector(updatedQueryVector);
}

export function applyIdeDecHi(
    queryVector: SparseVectorType,
    relevantVectors: SparseVectorType[],
    nonRelevantVectors: SparseVectorType[],
): SparseVectorType {
    const relevantSum = sumVectors(relevantVectors);
    const highestRankedNonRelevantVector = nonRelevantVectors[0] ?? {};
    const updatedQueryVector: SparseVectorType = {};

    const allTerms = getAllTerms([
        queryVector,
        relevantSum,
        highestRankedNonRelevantVector,
    ]);

    for (const term of allTerms) {
        const queryWeight = queryVector[term] ?? 0;
        const relevantWeight = relevantSum[term] ?? 0;
        const nonRelevantWeight = highestRankedNonRelevantVector[term] ?? 0;

        updatedQueryVector[term] = queryWeight + relevantWeight - nonRelevantWeight;
    }

    return clampPositiveVector(updatedQueryVector);
}
