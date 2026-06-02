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
import type { DocumentType, DocumentsCollectionType }from "@/types/document-collections";
import type { QueriesCollectionType, QueryType } from "@/types/queries";
import type { QrelsCollectionType } from "@/types/qrels";
import type { InvertedIndexType } from "@/types/inverted-index";
import type { IDFType } from "@/types/idf";
import type { DocumentVectorsType, SparseVectorType } from "@/types/document-vectors";

export type SearchResultType = {
    documentId: string;
    score: number;
};

export type BatchQueryResultType = {
    queryId: string;
    queryText: string;
    results: SearchResultType[];
    averagePrecision: number | null;
    relevantDocumentCount: number;
};

export type BatchSearchResultType = {
    queryResults: BatchQueryResultType[];
    meanAveragePrecision: number | null;
};

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

    search(query: string, topK: number = 10): SearchResultType[] {
        const queryVector = this.buildQueryVector(query);

        return this.rankDocuments(queryVector, topK);
    }

    async searchBatch(
        queryDocument: File,
        topK: number = 10,
        qrelsDocument?: File
    ): Promise<BatchSearchResultType> {
        await this.processQueries(queryDocument);

        if (qrelsDocument) {
            await this.processQrels(qrelsDocument);
        } else {
            this.qrels = null;
        }

        const queryResults = this.queries!.queries.map((query: QueryType): BatchQueryResultType => {
            const results = this.search(query.text, topK);
            const relevantDocumentIds = this.qrels?.[query.id] ?? [];

            return {
                queryId: query.id,
                queryText: query.text,
                results,
                averagePrecision: relevantDocumentIds.length > 0
                    ? this.computeAveragePrecision(results, relevantDocumentIds)
                    : null,
                relevantDocumentCount: relevantDocumentIds.length,
            };
        });

        const scoredQueries = queryResults.filter((result: BatchQueryResultType) => result.averagePrecision !== null);
        const meanAveragePrecision = scoredQueries.length > 0
            ? scoredQueries.reduce((sum: number, result: BatchQueryResultType) => sum + (result.averagePrecision ?? 0), 0) / scoredQueries.length
            : null;

        return {
            queryResults,
            meanAveragePrecision,
        };
    }

    applyFeedback(query: string, relevantDocs: DocumentVectorsType, nonRelevantDocs: DocumentVectorsType) {}


    // HELPER METHODS
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