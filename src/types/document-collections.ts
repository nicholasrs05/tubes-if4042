import z from "zod"

const DocumentSchema = z.object({
    id: z.string(),
    title: z.string(),
    author: z.string(),
    content: z.string(),
    concatenatedContent: z.string(),
})

export const DocumentsCollectionSchema = z.object({
    documents: z.array(DocumentSchema),
})

export type DocumentType = z.infer<typeof DocumentSchema>
export type DocumentsCollectionType = z.infer<typeof DocumentsCollectionSchema>