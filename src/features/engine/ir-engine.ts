import { parseCisiDocument } from "@/features/parser/cisi-parser";
import { parseQrelsDocument } from "@/features/parser/qrels-parser";
import { parseQueryDocuments } from "@/features/parser/query-parser";
import { preprocessText } from "../preprocessor/preprocess";
import {
    computeRawTermFrequency,
    computeTermFrequency,
    normalizeVector,
    cosineSimilarity,
} from "./weighting";

import type { SystemSettingsType } from "@/types/system-settings";
import type { DocumentType, DocumentsCollectionType } from "@/types/document-collections";
import type { QueriesCollectionType, QueryType } from "@/types/queries";
import type { QrelsCollectionType } from "@/types/qrels";
import type { InvertedIndexType } from "@/types/inverted-index";
import type { IDFType } from "@/types/idf";
import type { DocumentVectorsType, SparseVectorType } from "@/types/document-vectors";
import type {
    BatchQueryResultType,
    BatchSearchResultType,
    InitialSearchResponse,
    SearchResultResponse,
    SearchResultType,
} from "@/types/ir-engine";
import { applyIdeDecHi, applyIdeRegular, applyRocchio } from "./relevance-feedback";

export const DEFAULT_EXPANSION_TERMS_COUNT = 5;
const DEFAULT_PSEUDO_RELEVANT_DOCUMENTS_COUNT = 5;

export class IREngine {
    systemSettings: SystemSettingsType | null = null;
    documentsCollection: DocumentsCollectionType | null = null;
    queries: QueriesCollectionType | null = null;
    qrels: QrelsCollectionType | null = null;
    invertedIndex: InvertedIndexType | null = null;
    idf: IDFType | null = null;
    documentVectors: DocumentVectorsType | null = null;

    setSystemSettings(settings: SystemSettingsType) {
        this.systemSettings = settings;
    }

    setDocuments(documentsCollection: DocumentsCollectionType) {
        this.documentsCollection = documentsCollection;
    }

    setQueries(queries: QueriesCollectionType) {
        this.queries = queries;
    }

    setQrels(qrels: QrelsCollectionType) {
        this.qrels = qrels;
    }

    setInvertedIndex(invertedIndex: InvertedIndexType) {
        this.invertedIndex = invertedIndex;
    }

    setIdf(idf: IDFType) {
        this.idf = idf;
    }

    setDocumentVectors(documentVectors: DocumentVectorsType) {
        this.documentVectors = documentVectors;
    }

    async processDocumentCollection(documentCollection: File, settings: SystemSettingsType) {
        this.systemSettings = settings;

        this.documentsCollection = await parseCisiDocument(documentCollection);

        const preprocessedDocuments = this.documentsCollection.documents.map((doc: DocumentType) => ({
            docId: doc.id,
            tokens: preprocessText(doc.concatenatedContent, settings),
        }));
        this.invertedIndex = this.buildInvertedIndex(preprocessedDocuments);

        this.idf = this.computeIDF(this.invertedIndex, this.documentsCollection.documents.length);

        this.documentVectors = this.computeDocumentVectors(preprocessedDocuments, this.idf, settings);
    }

    async processQueries(queryDocument: File) {
        this.queries = await parseQueryDocuments(queryDocument);
    }

    async processQrels(qrelsDocument: File) {
        this.qrels = await parseQrelsDocument(qrelsDocument);
    }

    searchInitial(query: string, topK: number = 10): InitialSearchResponse {
        this.assertReady();

        const originalQuery = this.buildQueryVector(query);
        const pass1Results = this.rankDocuments(originalQuery, topK);

        return {
            originalQuery,
            pass1Results,
        };
    }

    search(query: string, topK: number = 10): SearchResultResponse {
        const initialSearch = this.searchInitial(query, topK);
        const pseudoRelevantDocumentIds = initialSearch.pass1Results
            .slice(0, Math.min(DEFAULT_PSEUDO_RELEVANT_DOCUMENTS_COUNT, initialSearch.pass1Results.length))
            .map((result) => result.documentId);

        return this.expandSearchWithFeedback(
            initialSearch.originalQuery,
            initialSearch.pass1Results,
            topK,
            pseudoRelevantDocumentIds,
            []
        );
    }

    expandSearchWithFeedback(
        originalQuery: SparseVectorType,
        pass1Results: SearchResultType[],
        topK: number,
        relevantDocumentIds: string[],
        nonRelevantDocumentIds?: string[],
        selectedExpansionTerms?: string[]
    ): SearchResultResponse {
        this.assertReady();

        const relevantSet = new Set(relevantDocumentIds);
        const resolvedNonRelevantDocumentIds = nonRelevantDocumentIds
            ?? pass1Results
                .map((result) => result.documentId)
                .filter((documentId) => !relevantSet.has(documentId));
        const updatedQuery = this.applyFeedback(
            originalQuery,
            relevantDocumentIds,
            resolvedNonRelevantDocumentIds,
            selectedExpansionTerms
        );
        const pass2Results = this.rankDocuments(updatedQuery, topK);

        return {
            originalQuery,
            updatedQuery,
            pass1Results,
            pass2Results,
            relevantDocumentIds,
            nonRelevantDocumentIds: resolvedNonRelevantDocumentIds,
        };
    }

    async searchBatch(
        queryDocument: File,
        topK: number = 10,
        qrelsDocument?: File
    ): Promise<BatchSearchResultType> {
        this.assertReady();
        await this.processQueries(queryDocument);

        if (qrelsDocument) {
            await this.processQrels(qrelsDocument);
        } else {
            this.qrels = null;
        }

        const queryResults = this.queries!.queries.map((query: QueryType): BatchQueryResultType => {
            const { originalQuery, pass1Results } = this.searchInitial(query.text, topK);
            const qrelsRelevantDocumentIds = this.qrels?.[query.id] ?? [];
            const qrelsRelevantDocumentSet = new Set(qrelsRelevantDocumentIds);
            const feedbackRelevantDocumentIds = qrelsRelevantDocumentIds.length > 0
                ? qrelsRelevantDocumentIds.filter((documentId) => Boolean(this.documentVectors?.[documentId]))
                : pass1Results
                    .slice(0, Math.min(DEFAULT_PSEUDO_RELEVANT_DOCUMENTS_COUNT, pass1Results.length))
                    .map((result) => result.documentId);
            const feedbackNonRelevantDocumentIds = qrelsRelevantDocumentIds.length > 0
                ? pass1Results
                    .map((result) => result.documentId)
                    .filter((documentId) => !qrelsRelevantDocumentSet.has(documentId))
                : [];
            const { updatedQuery, pass2Results } = this.expandSearchWithFeedback(
                originalQuery,
                pass1Results,
                topK,
                feedbackRelevantDocumentIds,
                feedbackNonRelevantDocumentIds
            );

            return {
                queryId: query.id,
                queryText: query.text,
                originalQuery,
                updatedQuery,
                pass1Results,
                pass2Results,
                pass1AP: qrelsRelevantDocumentIds.length > 0
                    ? this.computeAveragePrecision(pass1Results, qrelsRelevantDocumentIds)
                    : null,
                pass2AP: qrelsRelevantDocumentIds.length > 0
                    ? this.computeAveragePrecision(pass2Results, qrelsRelevantDocumentIds)
                    : null,
                relevantDocumentCount: qrelsRelevantDocumentIds.length,
                feedbackRelevantDocumentIds,
                feedbackNonRelevantDocumentIds,
            };
        });

        const scoredQueries = queryResults.filter((result: BatchQueryResultType) => result.pass1AP !== null);
        const pass1MAP = scoredQueries.length > 0
            ? scoredQueries.reduce((sum: number, result: BatchQueryResultType) => sum + (result.pass1AP ?? 0), 0) / scoredQueries.length
            : null;
        const pass2MAP = scoredQueries.length > 0
            ? scoredQueries.reduce((sum: number, result: BatchQueryResultType) => sum + (result.pass2AP ?? 0), 0) / scoredQueries.length
            : null;

        return {
            queryResults,
            pass1MAP,
            pass2MAP,
        };
    }

    getDocumentVector(documentId: string): SparseVectorType {
        return this.documentVectors?.[documentId] ?? {};
    }

    computeExpansionTermWeights(
        queryVector: SparseVectorType,
        relevantDocumentIds: string[],
        nonRelevantDocumentIds: string[],
    ): SparseVectorType {
        this.assertReady();

        const feedbackVector = this.computeFeedbackVector(
            queryVector,
            relevantDocumentIds,
            nonRelevantDocumentIds
        );
        const originalTerms = new Set(Object.keys(queryVector));

        return Object.fromEntries(
            Object.entries(feedbackVector)
                .filter(([term, weight]) => !originalTerms.has(term) && weight > 0)
                .sort((a, b) => b[1] - a[1])
        );
    }

    private computeFeedbackVector(
        queryVector: SparseVectorType,
        relevantDocumentIds: string[],
        nonRelevantDocumentIds: string[],
    ): SparseVectorType {
        const relevantVectors = this.getVectorsByDocumentIds(relevantDocumentIds);
        const nonRelevantVectors = this.getVectorsByDocumentIds(nonRelevantDocumentIds);
        const method = this.systemSettings!.relevanceFeedbackMethod;
        let feedbackVector: SparseVectorType = {};

        if (method === "rocchio") {
            feedbackVector = applyRocchio(queryVector, relevantVectors, nonRelevantVectors, this.systemSettings!);
        } else if (method === "ide") {
            feedbackVector = applyIdeRegular(queryVector, relevantVectors, nonRelevantVectors);
        } else if (method === "ide-dec-hi") {
            feedbackVector = applyIdeDecHi(queryVector, relevantVectors, nonRelevantVectors);
        }

        return feedbackVector;
    }

    private applyFeedback(
        queryVector: SparseVectorType,
        relevantDocumentIds: string[],
        nonRelevantDocumentIds: string[],
        selectedExpansionTerms?: string[],
    ): SparseVectorType {
        const feedbackVector = this.computeFeedbackVector(
            queryVector,
            relevantDocumentIds,
            nonRelevantDocumentIds
        );
        const originalTerms = new Set(Object.keys(queryVector));
        const selectedExpansionTermsSet = selectedExpansionTerms
            ? new Set(selectedExpansionTerms)
            : null;
        const expandedQuery: SparseVectorType = {};

        for (const term of originalTerms) {
            const feedbackWeight = feedbackVector[term];

            if (feedbackWeight === undefined) {
                expandedQuery[term] = queryVector[term];
            } else if (feedbackWeight > 0) {
                expandedQuery[term] = feedbackWeight;
            }
        }

        const expansionTerms = Object.entries(feedbackVector)
            .filter(([term, weight]) => !originalTerms.has(term) && weight > 0)
            .sort((a, b) => b[1] - a[1])
            .filter(([term]) => selectedExpansionTermsSet === null || selectedExpansionTermsSet.has(term))
            .slice(0, selectedExpansionTermsSet === null ? DEFAULT_EXPANSION_TERMS_COUNT : undefined);

        for (const [term, weight] of expansionTerms) {
            expandedQuery[term] = weight;
        }

        return this.systemSettings!.queryNormalization ? normalizeVector(expandedQuery) : expandedQuery;
    }

    private getVectorsByDocumentIds(documentIds: string[]): SparseVectorType[] {
        return documentIds
            .map((documentId) => this.documentVectors?.[documentId])
            .filter((vector): vector is SparseVectorType => Boolean(vector));
    }

    private assertReady() {
        if (!this.systemSettings || !this.documentsCollection || !this.idf || !this.documentVectors) {
            throw new Error("Mesin IR belum siap. Unggah dan proses koleksi dokumen terlebih dahulu.");
        }
    }

    private buildQueryVector(query: string): SparseVectorType {
        const queryTokens = preprocessText(query, this.systemSettings!);
        const queryTf = computeTermFrequency(
            queryTokens,
            this.systemSettings!,
            "query"
        );

        let queryVector: SparseVectorType = {};

        for (const [term, tfWeight] of Object.entries(queryTf)) {
            const idfWeight = this.systemSettings!.queryInverseDocumentFrequency
                ? this.idf![term] ?? 0
                : 1;

            queryVector[term] = tfWeight * idfWeight;
        }

        if (this.systemSettings!.queryNormalization) {
            queryVector = normalizeVector(queryVector);
        }

        return queryVector;
    }

    private rankDocuments(queryVector: SparseVectorType, topK: number): SearchResultType[] {
        const results = Object.entries(this.documentVectors!).map(
            ([documentId, documentVector]) => ({
                documentId,
                score: cosineSimilarity(queryVector, documentVector),
            })
        );

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    private computeAveragePrecision(results: SearchResultType[], relevantDocumentIds: string[]): number {
        const relevantDocumentsSet = new Set(relevantDocumentIds);
        let relevantFound = 0;
        let precisionSum = 0;

        for (const [index, result] of results.entries()) {
            if (!relevantDocumentsSet.has(result.documentId)) {
                continue;
            }

            relevantFound += 1;
            precisionSum += relevantFound / (index + 1);
        }

        return relevantDocumentsSet.size === 0 ? 0 : precisionSum / relevantDocumentsSet.size;
    }

    private buildInvertedIndex(
        preprocessedDocuments: { docId: string; tokens: string[] }[]
    ): InvertedIndexType {
        const invertedIndex: InvertedIndexType = {};

        for (const document of preprocessedDocuments) {
            const termFrequency = computeRawTermFrequency(document.tokens);

            for (const [term, tf] of Object.entries(termFrequency)) {
                if (!invertedIndex[term]) {
                    invertedIndex[term] = [];
                }

                invertedIndex[term].push({
                    documentId: document.docId,
                    termFrequency: tf,
                });
            }
        }

        return invertedIndex;
    }

    private computeIDF(
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

    private computeDocumentVectors(
        preprocessedDocuments: { docId: string; tokens: string[] }[],
        idf: IDFType,
        settings: SystemSettingsType
    ): DocumentVectorsType {
        const documentVectors: DocumentVectorsType = {};

        for (const document of preprocessedDocuments) {
            const tf = computeTermFrequency(
                document.tokens,
                settings
            );

            const vector: SparseVectorType = {};

            for (const [term, tfWeight] of Object.entries(tf)) {
                const idfWeight = settings.documentInverseDocumentFrequency ? idf[term] ?? 0 : 1;

                vector[term] = tfWeight * idfWeight;
            }

            documentVectors[document.docId] = settings.documentNormalization ? normalizeVector(vector) : vector;
        }

        return documentVectors;
    }
}
