import z from "zod"

const SystemSettingsSchema = z.object({
    stemWords: z.boolean(),
    eliminateStopWords: z.boolean(),
    queryTermFrequency: z.string(),
    queryInverseDocumentFrequency: z.boolean(),
    queryNormalization: z.boolean(),
    documentTermFrequency: z.string(),
    documentInverseDocumentFrequency: z.boolean(),
    documentNormalization: z.boolean(),
    relevanceFeedbackMethod: z.string(),
    rocchioBetaConstant: z.number(),
    rocchioGammaConstant: z.number(),
    topKRetrievedDocuments: z.number(),
})

export type SystemSettingsType = z.infer<typeof SystemSettingsSchema>