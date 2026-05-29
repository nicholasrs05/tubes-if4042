import z from "zod"

const QuerySchema = z.object({
    id: z.string(),
    text: z.string(),
})

const QueriesCollectionSchema = z.object({
    queries: z.array(QuerySchema),
})

export type QueryType = z.infer<typeof QuerySchema>
export type QueriesCollectionType = z.infer<typeof QueriesCollectionSchema>