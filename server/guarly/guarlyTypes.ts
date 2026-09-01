export interface BanInfo {
  bannedAt: number;
  expiresAt: number;
  reason: string;
}

export interface KnowledgeArticle {
  id: string;
  keywords: string[];
  title: string;
  content: string;
  action: { type: string; description: string; data: any };
}
