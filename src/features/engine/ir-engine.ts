import { parseCisiDocument } from "@/features/parser/cisi-parser";
import { preprocessText } from "../preprocessor/preprocess";
import { 
    computeRawTermFrequency, 
    computeTermFrequency, 
    normalizeVector,
    cosineSimilarity,
} from "./weighting";

import type { SystemSettingsType } from "@/types/system-settings";
import type { DocumentsCollectionType }from "@/types/document-collections";
import type { QueriesCollectionType } from "@/types/queries";
import type { QrelsCollectionType } from "@/types/qrels";
import type { InvertedIndexType } from "@/types/inverted-index";
import type { IDFType } from "@/types/idf";
import type { DocumentVectorsType, SparseVectorType } from "@/types/document-vectors";

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

        const preprocessedDocuments = this.documentsCollection.documents.map((doc) => ({
            docId: doc.id,
            tokens: preprocessText(doc.concatenatedContent, settings),
        }));
        this.invertedIndex = this.buildInvertedIndex(preprocessedDocuments);

        this.idf = this.computeIDF(this.invertedIndex, this.documentsCollection.documents.length);

        this.documentVectors = this.computeDocumentVectors(preprocessedDocuments, this.idf, settings);
    }

    search(query: string, topK: number = 10): { documentId: string; score: number }[] {
        const queryTokens = preprocessText(query, this.systemSettings!);
        const queryTf = computeTermFrequency(
            queryTokens,
            this.systemSettings!
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

        
    applyFeedback(query: string, relevantDocs: DocumentVectorsType, nonRelevantDocs: DocumentVectorsType) {}


    // HELPER METHODS
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

        for (const [term, postingList] of Object.entries(invertedIndex)) {
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