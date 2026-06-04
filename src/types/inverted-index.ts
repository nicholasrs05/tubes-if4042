import z from "zod"

export const InvertedIndexSchema = z.record(
    z.string(), 
    z.array(z.object({
        documentId: z.string(),
        termFrequency: z.number(),
    }))
)

export type InvertedIndexType = z.infer<typeof InvertedIndexSchema>
