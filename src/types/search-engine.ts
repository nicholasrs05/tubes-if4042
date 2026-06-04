import type { RefObject } from "react";
import z from "zod";

import type { IREngine } from "@/features/engine/ir-engine";
import { DocumentSchema } from "@/types/document-collections";
import { SparseVectorSchema } from "@/types/document-vectors";
import { SystemSettingsSchema } from "@/types/system-settings";

export const SearchModeSchema = z.enum(["single", "batch"]);
export type SearchMode = z.infer<typeof SearchModeSchema>;

export const ResultPhaseSchema = z.enum(["before", "after"]);
export type ResultPhase = z.infer<typeof ResultPhaseSchema>;

export const DocumentCollectionStatusSchema = z.enum(["idle", "processing", "done", "error"]);
export type DocumentCollectionStatus = z.infer<typeof DocumentCollectionStatusSchema>;

export const SearchInputFileTypeSchema = z.enum([
    "documentCollection",
    "batchQuery",
    "batchRelevanceFeedback",
]);
export type SearchInputFileType = z.infer<typeof SearchInputFileTypeSchema>;

export const SearchEnginePropsSchema = z.object({
    irEngineRef: z.custom<RefObject<IREngine>>(),
    systemSettings: SystemSettingsSchema,
    searchQuery: z.string(),
    setSearchQuery: z.custom<(query: string) => void>(),
});
export type SearchEngineProps = z.infer<typeof SearchEnginePropsSchema>;

export const SearchResultSchema = z.object({
    documentId: z.string(),
    score: z.number(),
    document: DocumentSchema.nullable(),
    weights: SparseVectorSchema,
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SingleSearchStateSchema = z.object({
    queryText: z.string(),
    originalQuery: SparseVectorSchema,
    updatedQuery: SparseVectorSchema.nullable(),
    beforeResults: z.array(SearchResultSchema),
    afterResults: z.array(SearchResultSchema),
    feedbackRelevantDocumentIds: z.array(z.string()),
    feedbackNonRelevantDocumentIds: z.array(z.string()),
});
export type SingleSearchState = z.infer<typeof SingleSearchStateSchema>;

export const BatchQueryResultSchema = z.object({
    queryId: z.string(),
    queryText: z.string(),
    originalQuery: SparseVectorSchema,
    updatedQuery: SparseVectorSchema,
    beforeResults: z.array(SearchResultSchema),
    afterResults: z.array(SearchResultSchema),
    pass1AP: z.number().nullable(),
    pass2AP: z.number().nullable(),
    relevantDocumentCount: z.number(),
    feedbackRelevantDocumentIds: z.array(z.string()),
    feedbackNonRelevantDocumentIds: z.array(z.string()),
});
export type BatchQueryResult = z.infer<typeof BatchQueryResultSchema>;
