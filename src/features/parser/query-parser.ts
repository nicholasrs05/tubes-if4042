import { type QueriesCollectionType, type QueryType } from "@/types/queries";

function extractSection(block: string, marker: string): string {
	const regex = new RegExp(`\\.${marker}\\s*\\n([\\s\\S]*?)(?=\\n\\.[A-Z]|$)`);
	return block.match(regex)?.[1].trim() ?? "";
}

export async function parseQueryDocuments(document: File): Promise<QueriesCollectionType> {
	const text = await document.text();

	const blocks = text
		.split(/(?=\.I\s+\d+)/g)
		.map((block) => block.trim())
		.filter(Boolean);

	const queries: QueryType[] = blocks.map((block) => ({
		id: block.match(/^\.I\s+(\d+)/)?.[1] ?? "",
		text: extractSection(block, "W"),
	}));

	return {
		queries,
	};
}