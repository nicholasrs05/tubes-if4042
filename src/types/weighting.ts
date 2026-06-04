import z from "zod";

export const TermFrequencyVariantSchema = z.enum([
    "raw",
    "binary",
    "logarithmic",
    "augmented",
]);

export type TermFrequencyVariant = z.infer<typeof TermFrequencyVariantSchema>;
