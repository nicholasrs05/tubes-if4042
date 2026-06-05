import z from "zod";

import { DocumentSchema } from "@/types/document-collections";
import { DocumentVectorsSchema } from "@/types/document-vectors";
import { InvertedIndexSchema } from "@/types/inverted-index";

export const InvertedIndexSnapshotSchema = z.object({
    documents: z.array(DocumentSchema),
    invertedIndex: InvertedIndexSchema,
    documentVectors: DocumentVectorsSchema,
});

export type InvertedIndexSnapshot = z.infer<typeof InvertedIndexSnapshotSchema>;

export const InvertedIndexInspectorPropsSchema = z.object({
    snapshot: InvertedIndexSnapshotSchema.nullable(),
    isEnabled: z.boolean(),
});

export type InvertedIndexInspectorProps = z.infer<typeof InvertedIndexInspectorPropsSchema>;

export const DocumentTermEntrySchema = z.object({
    term: z.string(),
    termFrequency: z.number(),
    weight: z.number().nullable(),
});

export type DocumentTermEntry = z.infer<typeof DocumentTermEntrySchema>;

export const PostingDisplayEntrySchema = z.object({
    documentId: z.string(),
    title: z.string().nullable(),
    author: z.string().nullable(),
    termFrequency: z.number(),
    weight: z.number().nullable(),
});

export type PostingDisplayEntry = z.infer<typeof PostingDisplayEntrySchema>;
