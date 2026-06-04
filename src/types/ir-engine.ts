import z from "zod";

import { SparseVectorSchema } from "@/types/document-vectors";

export const EngineSearchResultSchema = z.object({
    documentId: z.string(),
    score: z.number(),
});

export type SearchResultType = z.infer<typeof EngineSearchResultSchema>;

export const InitialSearchResponseSchema = z.object({
    originalQuery: SparseVectorSchema,
    pass1Results: z.array(EngineSearchResultSchema),
});

export type InitialSearchResponse = z.infer<typeof InitialSearchResponseSchema>;

export const SearchResultResponseSchema = z.object({
    originalQuery: SparseVectorSchema,
    updatedQuery: SparseVectorSchema,
    pass1Results: z.array(EngineSearchResultSchema),
    pass2Results: z.array(EngineSearchResultSchema),
    relevantDocumentIds: z.array(z.string()),
    nonRelevantDocumentIds: z.array(z.string()),
});

export type SearchResultResponse = z.infer<typeof SearchResultResponseSchema>;

export const BatchQueryResultSchema = z.object({
    queryId: z.string(),
    queryText: z.string(),
    originalQuery: SparseVectorSchema,
    updatedQuery: SparseVectorSchema,
    pass1Results: z.array(EngineSearchResultSchema),
    pass2Results: z.array(EngineSearchResultSchema),
    pass1AP: z.number().nullable(),
    pass2AP: z.number().nullable(),
    relevantDocumentCount: z.number(),
    feedbackRelevantDocumentIds: z.array(z.string()),
    feedbackNonRelevantDocumentIds: z.array(z.string()),
});

export type BatchQueryResultType = z.infer<typeof BatchQueryResultSchema>;

export const BatchSearchResultSchema = z.object({
    queryResults: z.array(BatchQueryResultSchema),
    pass1MAP: z.number().nullable(),
    pass2MAP: z.number().nullable(),
});

export type BatchSearchResultType = z.infer<typeof BatchSearchResultSchema>;
