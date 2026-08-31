import type { Metadata } from "next";
import Link from "next/link";
import { formatPostDate, getAllPosts } from "@/lib/posts";
import PostThumbnail from "@/components/PostThumbnail";

export const metadata: Metadata = {
  title: "Blog — PennyWisecrack",
};

export default function Blog() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Blog
      </h1>
      <p className="mt-4 text-foreground/70">
        Notes, guides, and updates from PennyWisecrack.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="flex gap-4 overflow-hidden rounded-lg border border-border p-4 transition-colors hover:border-baby-blue"
          >
            <PostThumbnail
              src={post.thumbnail}
              title={post.title}
              className="h-20 w-20 shrink-0 rounded-md"
            />
            <div>
              <h2 className="font-medium">{post.title}</h2>
              {post.date && (
                <p className="mt-1 text-xs text-foreground/50">
                  {formatPostDate(post.date)}
                </p>
              )}
              <p className="mt-2 line-clamp-2 text-sm text-foreground/60">
                {post.excerpt}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
