import type { SystemSettingsType } from "@/types/system-settings";

export function applyRocchio(queryVector: any, relevantVectors: any, nonRelevantVectors: any, settings: SystemSettingsType) {

    const c = 1; // Original query weight
    const beta = settings.rocchioBetaConstant; // Relevant documents weight
    const gamma = settings.rocchioGammaConstant; // Non-relevant documents weight

    const n1 = relevantVectors.length;
    const n2 = nonRelevantVectors.length;

    const relevantCentroid = n1 > 0
        ? Object.fromEntries(
            Object.keys(relevantVectors[0]).map((term) => [
                term, 
                relevantVectors.reduce((sum: any, vec: { [x: string]: any; }) => sum + (vec[term] ?? 0), 0) / n1,
            ])
        )
        : {};

    const nonRelevantCentroid = n2 > 0
        ? Object.fromEntries(
            Object.keys(nonRelevantVectors[0]).map((term) => [
                term, 
                nonRelevantVectors.reduce((sum: any, vec: { [x: string]: any; }) => sum + (vec[term] ?? 0), 0) / n2,
            ])
        )
        : {};
    
    const updatedQueryVector: Record<string, number> = {};

    const allTerms = new Set([
        ...Object.keys(queryVector),
        ...Object.keys(relevantCentroid),
        ...Object.keys(nonRelevantCentroid),
    ]);
    for (const term of allTerms) {
        const qWeight = queryVector[term] ?? 0;
        const rWeight = relevantCentroid[term] ?? 0;
        const nrWeight = nonRelevantCentroid[term] ?? 0;
        updatedQueryVector[term] = c * qWeight + beta * rWeight - gamma * nrWeight;
    }

    return updatedQueryVector;

}

export function applyIdeRegular(queryVector: any, relevantVectors: any, nonRelevantVectors: any, settings: SystemSettingsType) {

    const c = 1; // Original query weight

    const n1 = relevantVectors.length;
    const n2 = nonRelevantVectors.length;

    const relevantSum = n1 > 0
        ? Object.fromEntries(
            Object.keys(relevantVectors[0]).map((term) => [
                term, 
                relevantVectors.reduce((sum: any, vec: { [x: string]: any; }) => sum + (vec[term] ?? 0), 0),
            ])
        )
        : {};

    const nonRelevantSum = n2 > 0
        ? Object.fromEntries(
            Object.keys(nonRelevantVectors[0]).map((term) => [
                term, 
                nonRelevantVectors.reduce((sum: any, vec: { [x: string]: any; }) => sum + (vec[term] ?? 0), 0),
            ])
        )
        : {};
    
    const updatedQueryVector: Record<string, number> = {};

    const allTerms = new Set([
        ...Object.keys(queryVector),
        ...Object.keys(relevantSum),
        ...Object.keys(nonRelevantSum),
    ]);
    for (const term of allTerms) {
        const qWeight = queryVector[term] ?? 0;
        const rWeight = relevantSum[term] ?? 0;
        const nrWeight = nonRelevantSum[term] ?? 0;
        updatedQueryVector[term] = c * qWeight + rWeight - nrWeight;
    }

    return updatedQueryVector;

}

export function applyIdeDecHi(queryVector: any, relevantVectors: any, nonRelevantVectors: any, settings: SystemSettingsType) {

    const c = 1; // Original query weight

    const n1 = relevantVectors.length;
    const n2 = nonRelevantVectors.length;

    const relevantSum = n1 > 0
        ? Object.fromEntries(
            Object.keys(relevantVectors[0]).map((term) => [
                term, 
                relevantVectors.reduce((sum: any, vec: { [x: string]: any; }) => sum + (vec[term] ?? 0), 0),
            ])
        )
        : {};

    const topNonRelevantSum = n2 > 0
        ? nonRelevantVectors[0] // Assuming nonRelevantVectors are sorted by rank
        : {};
    
    const updatedQueryVector: Record<string, number> = {};

    const allTerms = new Set([
        ...Object.keys(queryVector),
        ...Object.keys(relevantSum),
        ...Object.keys(topNonRelevantSum),
    ]);
    for (const term of allTerms) {
        const qWeight = queryVector[term] ?? 0;
        const rWeight = relevantSum[term] ?? 0;
        const nrWeight = topNonRelevantSum [term] ?? 0;
        updatedQueryVector[term] = c * qWeight + rWeight - nrWeight;
    }

    return updatedQueryVector;

}