export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId?: string;
  listingCount?: number;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}