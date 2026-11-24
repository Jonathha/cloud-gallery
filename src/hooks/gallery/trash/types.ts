export interface TrashImage {
  id: string;
  url: string;
  createdAt: any;
  deletedAt?: number;
  trashedAt?: number | any;
  restoredAt?: number | any;
  protectedAt?: number | any;
  isVideo?: boolean;
  noThumbnail?: boolean;
}
