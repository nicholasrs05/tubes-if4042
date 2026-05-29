import type { DocumentType, DocumentsCollectionType } from "@/types/document-collections";
import { DocumentsCollectionSchema } from "@/types/document-collections";

function extractSection(block: string, marker: string): string {
    const regex = new RegExp(`\\.${marker}\\s*\\n([\\s\\S]*?)(?=\\n\\.[A-Z]|$)`);
    return block.match(regex)?.[1].trim() ?? "";
}

export async function parseCisiDocument(document: File): Promise<DocumentsCollectionType> {
    const text = await document.text();

    const blocks = text.split(/(?=\.I\s+\d+)/g)
        .map((block) => block.trim())
        .filter(Boolean);

    const documents: DocumentType[] = blocks.map((block) => {
        const id = block.match(/^\.I\s+(\d+)/)?.[1] ?? "";

        const title = extractSection(block, "T");
        const author = extractSection(block, "A");
        const content = extractSection(block, "W");

        const concatenatedContent = [title, author, content]
            .filter(Boolean)
            .join(" ");

        return {
            id,
            title,
            author,
            content,
            concatenatedContent,
        };
    });

    return DocumentsCollectionSchema.parse({
        documents,
    });
}