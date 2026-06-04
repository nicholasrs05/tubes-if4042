import z from "zod"

const SparseVectorSchema = z.record(
    z.string(), 
    z.number()
)

export type SparseVectorType = z.infer<typeof SparseVectorSchema>

export const DocumentVectorsSchema = z.record(
    z.string(), 
    SparseVectorSchema
)

export type DocumentVectorsType = z.infer<typeof DocumentVectorsSchema>
