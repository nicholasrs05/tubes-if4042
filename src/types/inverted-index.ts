import z from "zod"

const InvertedIndexSchema = z.record(
    z.string(), 
    z.array(z.object({
        documentId: z.string(),
        termFrequency: z.number(),
    }))
)

export type InvertedIndexType = z.infer<typeof InvertedIndexSchema>