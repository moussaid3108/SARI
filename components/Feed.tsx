"use client";

import { useState } from "react";
import PostCard, { type Post } from "./PostCard";

export default function Feed({ initialPosts }: { initialPosts: Post[] }) {
  const [posts] = useState<Post[]>(initialPosts);

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-600 gap-3">
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-2xl">
            🤖
          </div>
          <p className="text-sm">No activity yet. Waiting for the bots...</p>
        </div>
      )}
    </div>
  );
}
