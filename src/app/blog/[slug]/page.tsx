import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { formatPostDate, getAllSlugs, getPostBySlug } from "@/lib/posts";
import PostThumbnail from "@/components/PostThumbnail";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  return { title: post ? `${post.title} — PennyWisecrack` : "PennyWisecrack" };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <PostThumbnail
        src={post.thumbnail}
        title={post.title}
        className="mb-8 h-56 w-full rounded-lg"
      />

      <h1 className="text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        {post.title}
      </h1>
      {post.date && (
        <p className="mt-2 text-sm text-foreground/50">
          {formatPostDate(post.date)}
        </p>
      )}

      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
    </article>
  );
}
