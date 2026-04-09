/**
 * Demo fallback when `ResourceLibraryLink` is not in the deployed API yet or cloud data
 * is disabled. Home uses per-program rows from DynamoDB when available.
 */
export type ResourceLibraryItem = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  kind: "article" | "video";
  color: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
};

export const resourceLibraryItems: ResourceLibraryItem[] = [
  {
    id: "1",
    title: "Mental Health Monday",
    subtitle: "Article · weekly wellness tips",
    url: "https://www.samhsa.gov/mental-health",
    kind: "article",
    color: "bg-violet-200",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1499200166369-fc8c544a46af?w=640&h=360&fit=crop&q=80",
  },
  {
    id: "2",
    title: "JKL program newsletter",
    subtitle: "PDF / link placeholder",
    url: "https://www.jklprograms.org",
    kind: "article",
    color: "bg-zinc-200",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=640&h=360&fit=crop&q=80",
  },
  {
    id: "3",
    title: "JKL history intro",
    subtitle: "Video · program overview",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    kind: "video",
    color: "bg-rose-200",
  },
];
