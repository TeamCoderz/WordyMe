import { Button } from '@repo/ui/components/button';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { Star } from '@repo/ui/components/icons';
import { useSpaceFavoritesMutation } from '@/queries/spaces';
import { useActions } from '@/store';

interface FavoriteSpaceItemProps {
  space: {
    id: string;
    name: string;
    icon: string | null;
  };
}

export function FavoriteSpaceItem({ space }: FavoriteSpaceItemProps) {
  const { removeFromFavorites, isRemoving } = useSpaceFavoritesMutation();
  const { setActiveSpaceBySpaceId } = useActions();

  const handleRemoveFromFavorites = async () => {
    await removeFromFavorites(space.id);
  };

  return (
    <div
      className="p-4 flex gap-3 items-center bg-home-card rounded-md cursor-pointer"
      onClick={() => setActiveSpaceBySpaceId(space.id)}
      role="button"
      tabIndex={0}
    >
      <div className="bg-muted p-2 rounded-md">
        <DynamicIcon name={space.icon || 'folder'} className="size-4" />
      </div>
      <p className="text-sm flex-1 truncate">{space.name}</p>
      <Button
        variant="ghost"
        size="icon"
        disabled={isRemoving}
        onClick={(e) => {
          e.stopPropagation();
          handleRemoveFromFavorites();
        }}
      >
        <Star className="size-4 stroke-none fill-[#F2C40D]" />
      </Button>
    </div>
  );
}
