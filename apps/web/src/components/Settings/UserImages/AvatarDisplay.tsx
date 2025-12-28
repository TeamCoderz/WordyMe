import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { PencilLine } from '@repo/ui/components/icons';
import { useSelector } from '@/store';

interface AvatarDisplayProps {
  onEdit: () => void;
}

export default function AvatarDisplay({ onEdit }: AvatarDisplayProps) {
  const user = useSelector((state) => state.user);

  return (
    <div className="relative group">
      <Avatar className="h-28 w-28">
        <AvatarImage src={user?.avatar_image?.calculatedImage ?? undefined} />
        <AvatarFallback>
          {user?.name
            ?.split(' ')
            .slice(0, 2)
            .map((n: string) => n[0])
            .join('')}
        </AvatarFallback>
      </Avatar>
      {user?.avatar_image?.url && user?.avatar_image?.provider !== 'auth_provider' && (
        <button
          type="button"
          onClick={onEdit}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100 rounded-md overflow-hidden"
        >
          <PencilLine className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
