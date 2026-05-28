import type { SystemSettingsType } from "@/types/system-settings";

export function tokenize(text: any) {}

export function eliminateStopWords(tokens: any) {}

export function stemWords(tokens: any) {}

export function preprocessText(text: any, settings: SystemSettingsType) {
    let tokens = tokenize(text);
    if (settings.eliminateStopWords) {
        tokens = eliminateStopWords(tokens);
    }
    if (settings.stemWords) {
        tokens = stemWords(tokens);
    }

    return tokens;
}