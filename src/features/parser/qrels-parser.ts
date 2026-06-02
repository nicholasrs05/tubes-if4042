import { QrelsCollectionSchema, type QrelsCollectionType } from "@/types/qrels";

export async function parseQrelsDocument(document: File): Promise<QrelsCollectionType> {
	const text = await document.text();
	const qrels: QrelsCollectionType = {};

	for (const line of text.split(/\r?\n/)) {
		const trimmedLine = line.trim();

		if (!trimmedLine) {
			continue;
		}

		const [queryId, documentId] = trimmedLine.split(/\s+/);

		if (!queryId || !documentId) {
			continue;
		}

		if (!qrels[queryId]) {
			qrels[queryId] = [];
		}

		qrels[queryId].push(documentId);
	}

	return QrelsCollectionSchema.parse(qrels);
}