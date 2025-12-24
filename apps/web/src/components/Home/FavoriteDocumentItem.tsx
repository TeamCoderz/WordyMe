import { Button } from '@repo/ui/components/button';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { Star } from '@repo/ui/components/icons';
import { ListDocumentResult, useDocumentFavoritesMutation } from '@/queries/documents';
import { Link } from '@tanstack/react-router';

interface FavoriteDocumentItemProps {
  document: ListDocumentResult[number];
}

export function FavoriteDocumentItem({ document }: FavoriteDocumentItemProps) {
  const { removeDocumentFromFavorites } = useDocumentFavoritesMutation({
    document,
  });

  const handleRemoveFromFavorites = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeDocumentFromFavorites(document.id);
  };

  return (
    <Link
      to="/view/$handle"
      params={{ handle: document.handle ?? document.id }}
      className="p-4 flex gap-3 items-center bg-home-card rounded-md"
    >
      <div className="bg-muted p-2 rounded-md">
        <DynamicIcon name={document.icon || 'file'} className="size-4" />
      </div>
      <p className="text-sm flex-1 truncate">{document.name}</p>
      <Button variant="ghost" size="icon" onClick={handleRemoveFromFavorites}>
        <Star className="size-4 stroke-none fill-[#F2C40D]" />
      </Button>
    </Link>
  );
}
