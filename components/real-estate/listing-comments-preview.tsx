'use client';

import type { ListingComment } from '@/lib/real-estate/types';

export function ListingCommentsPreview({ comments, total, onOpen }: { comments: ListingComment[]; total: number; onOpen: () => void }) {
  if (comments.length === 0) return null;
  return (
    <div className="space-y-2 rounded-xl bg-[#f5f7f3] p-3 dark:bg-white/5">
      {comments.map((comment) => (
        <p key={comment.id} className="line-clamp-2 text-xs leading-5 text-[#2d3a31] dark:text-[#d7e3d8]">
          <span className="font-semibold">{comment.authorName}</span> {comment.body}
        </p>
      ))}
      {total > comments.length && (
        <button onClick={onOpen} className="text-xs font-semibold text-[#f43f68] transition hover:underline">Tüm {total} yorumu gör</button>
      )}
    </div>
  );
}
