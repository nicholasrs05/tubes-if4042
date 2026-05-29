import stem from "wink-porter2-stemmer";

import type { SystemSettingsType } from "@/types/system-settings";
import { NLTK_STOPWORDS } from "@/features/preprocessor/nltk-stopwords";

const NLTK_STOPWORDS_SET = new Set(NLTK_STOPWORDS);

export function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}

export function eliminateStopWords(tokens: string[]): string[] {
    return tokens.filter((token) => !NLTK_STOPWORDS_SET.has(token));
}

export function stemWords(tokens: string[]): string[] {
    return tokens.map((token) => stem(token));
}

export function preprocessText(text: string, settings: SystemSettingsType) {
    let tokens = tokenize(text);
    if (settings.eliminateStopWords) {
        tokens = eliminateStopWords(tokens);
    }
    if (settings.stemWords) {
        tokens = stemWords(tokens);
    }

    return tokens;
}
