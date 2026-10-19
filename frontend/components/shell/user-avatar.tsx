import { avatarSrc } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export function UserAvatar({
  user,
  className,
}: {
  user: { name: string; avatarUrl: string | null };
  className?: string;
}) {
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        user.name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
