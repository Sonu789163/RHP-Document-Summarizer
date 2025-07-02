import localforage from "localforage";

export interface Summary {
  id: string;
  documentId: string;
  content: string;
  createdAt: string;
  title: string;
}

const getStorageKey = (docId: string) => `summaries_${docId}`;

export const summaryStorageService = {
  async getSummaries(docId: string): Promise<Summary[]> {
    if (!docId) return [];
    const summaries = await localforage.getItem<Summary[]>(
      getStorageKey(docId)
    );
    return summaries || [];
  },

  async saveSummary(newSummary: Summary): Promise<void> {
    const summaries = await this.getSummaries(newSummary.documentId);
    const updatedSummaries = [newSummary, ...summaries];
    await localforage.setItem(
      getStorageKey(newSummary.documentId),
      updatedSummaries
    );
  },

  async deleteSummary(docId: string, summaryId: string): Promise<void> {
    const summaries = await this.getSummaries(docId);
    const updatedSummaries = summaries.filter(
      (summary) => summary.id !== summaryId
    );
    await localforage.setItem(getStorageKey(docId), updatedSummaries);
  },
};
