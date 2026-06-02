import z from "zod"

const QrelsCollectionSchema = z.record(
    z.string(), 
    z.array(z.string())
)

export { QrelsCollectionSchema }
export type QrelsCollectionType = z.infer<typeof QrelsCollectionSchema>