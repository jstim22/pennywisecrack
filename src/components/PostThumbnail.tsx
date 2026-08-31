import Image from "next/image";

export default function PostThumbnail({
  src,
  title,
  className = "",
}: {
  src?: string;
  title: string;
  className?: string;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden bg-surface-hover ${className}`}>
        <Image src={src} alt="" fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-navy to-baby-blue text-white ${className}`}
      aria-hidden="true"
    >
      <span className="text-2xl font-semibold opacity-90">
        {title.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
