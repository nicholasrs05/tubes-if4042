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
import { applyIdeDecHi, applyIdeRegular, applyRocchio } from "./relevance-feedback";

export type SearchResultType = {
    documentId: string;
    score: number;
};

export type SearchResultResponse = {
    originalQuery: SparseVectorType;
    updatedQuery: SparseVectorType;
    pass1Results: SearchResultType[];
    pass2Results: SearchResultType[];
}

export type BatchQueryResultType = {
    queryId: string;
    queryText: string;
    pass1Results: SearchResultType[];
    pass2Results: SearchResultType[];
    pass1AP: number | null;
    pass2AP: number | null;
    // results: SearchResultType[];
    // averagePrecision: number | null;
    relevantDocumentCount: number;
};

export type BatchSearchResultType = {
    queryResults: BatchQueryResultType[];
    pass1MAP: number | null;
    pass2MAP: number | null;
    // meanAveragePrecision: number | null;
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

    // search(query: string, topK: number = 10): SearchResultType[] {
    //     const queryVector = this.buildQueryVector(query);

    //     return this.rankDocuments(queryVector, topK);
    // }

    // Search di update untuk akomodasi relevance feedback
    search(query: string, topK: number = 10): SearchResultResponse {
        const originalQuery = this.buildQueryVector(query);
        const pass1Results = this.rankDocuments(originalQuery, topK);

        const updatedQuery = this.applyFeedback(originalQuery, pass1Results);
        const pass2Results = this.rankDocuments(updatedQuery, topK);

        return {
            originalQuery: originalQuery,
            updatedQuery: updatedQuery,
            pass1Results: pass1Results,
            pass2Results: pass2Results,
        };
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
            const { pass1Results, pass2Results } = this.search(query.text, topK);
            const relevantDocumentIds = this.qrels?.[query.id] ?? [];

            return {
                queryId: query.id,
                queryText: query.text,
                pass1Results,
                pass2Results,
                pass1AP: relevantDocumentIds.length > 0
                    ? this.computeAveragePrecision(pass1Results, relevantDocumentIds)
                    : null,
                pass2AP: relevantDocumentIds.length > 0
                    ? this.computeAveragePrecision(pass2Results, relevantDocumentIds)
                    : null,
                relevantDocumentCount: relevantDocumentIds.length,
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

    applyFeedback(queryVector: SparseVectorType, initialResults: SearchResultType[]): SparseVectorType {
        const prfDocs = initialResults.slice(0, 5).map(r => this.documentVectors![r.documentId]);
        const nonRelevantDocs: SparseVectorType[] = []; 
        
        let feedbackVector: Record<string, number> = {};
        const method = this.systemSettings!.relevanceFeedbackMethod;

        if (method === "rocchio") {
            feedbackVector = applyRocchio(queryVector, prfDocs, nonRelevantDocs, this.systemSettings!);
        } else if (method === "ide") {
            feedbackVector = applyIdeRegular(queryVector, prfDocs, nonRelevantDocs, this.systemSettings!);
        } else if (method === "ide-dec-hi") {
            feedbackVector = applyIdeDecHi(queryVector, prfDocs, nonRelevantDocs, this.systemSettings!);
        }

        const expanded = { ...queryVector };
        const newTerms = Object.entries(feedbackVector)
            .filter(([term, weight]) => !(term in queryVector) && weight > 0)
            .sort((a, b) => b[1] - a[1]);

        // @ts-ignore : Pastikan expandAllTerms dan expansionTermsCount terdefinisi di type systemSettings sebelumnya
        const termsToAdd = this.systemSettings!.expandAllTerms 
            ? newTerms 
            : newTerms.slice(0, (this.systemSettings! as any).expansionTermsCount ?? 5);

        for (const [term, weight] of termsToAdd) expanded[term] = weight;

        return this.systemSettings!.queryNormalization ? normalizeVector(expanded) : expanded;
    }


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