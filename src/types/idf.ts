import z from "zod"

export const IDFSchema = z.record(
    z.string(), 
    z.number()
)

export type IDFType = z.infer<typeof IDFSchema>
