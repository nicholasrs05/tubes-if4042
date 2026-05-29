import z from "zod"

const IDFSchema = z.record(
    z.string(), 
    z.number()
)

export type IDFType = z.infer<typeof IDFSchema>