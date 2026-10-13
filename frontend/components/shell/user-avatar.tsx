import { avatarSrc, type User } from "@/lib/api/client";
import { cn } from "@/lib/utils";

// FR-SET-01: the photo if there is one, otherwise the name's first letter. Always round.
export function UserAvatar({ user, className }: { user: User; className?: string }) {
  const src = avatarSrc(user);
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-xs font-medium",
        className,
      )}
    >
      {src ? (
        // ponytail: plain <img>; the API already sends a cacheable, right-sized file.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        user.name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
