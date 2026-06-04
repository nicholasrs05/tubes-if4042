import type { SystemSettingsType } from "@/types/system-settings";
import type { SparseVectorType } from "@/types/document-vectors";

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
        return {};
    }

    const summedVector: SparseVectorType = {};

    for (const term of getAllTerms(vectors)) {
        summedVector[term] = vectors.reduce((sum, vector) => sum + (vector[term] ?? 0), 0);
    }

    return summedVector;
}

function averageVectors(vectors: SparseVectorType[]): SparseVectorType {
    if (vectors.length === 0) {
        return {};
    }

    const summedVector = sumVectors(vectors);

    const averageVector: SparseVectorType = {};

    for (const term in summedVector) {
        averageVector[term] = summedVector[term] / vectors.length;
    }

    return averageVector;
}

function clampPositiveVector(vector: SparseVectorType): SparseVectorType {
    const clampedVector: SparseVectorType = {};

    for (const term in vector) {
        clampedVector[term] = Math.max(0, vector[term]);
    }

    return clampedVector;
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
