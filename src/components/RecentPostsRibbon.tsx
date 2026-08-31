import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import PostThumbnail from "@/components/PostThumbnail";

export default function RecentPostsRibbon() {
  const posts = getAllPosts().slice(0, 3);

  if (posts.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          Recent posts
        </h2>
        <Link
          href="/blog"
          className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
        >
          View all
        </Link>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block overflow-hidden rounded-lg border border-border transition-colors hover:border-baby-blue"
          >
            <PostThumbnail
              src={post.thumbnail}
              title={post.title}
              className="h-32 w-full"
            />
            <div className="p-4">
              <h3 className="font-medium">{post.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-foreground/60">
                {post.excerpt}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
