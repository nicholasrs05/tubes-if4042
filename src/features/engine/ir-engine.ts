import type { SystemSettingsType } from "@/types/system-settings";

class IREngine {
    documents: any;
    queries: any;
    qrels: any;
    invertedIndex: any;
    idf: any;
    documentVectors: any;

    build(files: any, settings: SystemSettingsType) {}

    search(query: string, settings: SystemSettingsType) {}

    applyFeedback(query: string, relevantDocs: any, nonRelevantDocs: any, settings: SystemSettingsType) {}
}