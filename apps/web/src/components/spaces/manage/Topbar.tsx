import { Button } from '@repo/ui/components/button';
import { FolderPlus, FolderInput, BriefcaseMedical } from '@repo/ui/components/icons';

export interface ManageSpacesTopbarProps {
  onCreateSpace: () => void;
  onCreateFolder: () => void;
  onImportSpace: () => void;
}

export function ManageSpacesTopbar({
  onCreateSpace,
  onCreateFolder,
  onImportSpace,
}: ManageSpacesTopbarProps) {
  return (
    <>
      <div className="px-4 h-14 border-b-1 flex items-center justify-between">
        <h2 className="text-lg font-bold">Manage Spaces</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateSpace}
            className="flex items-center gap-2"
          >
            <BriefcaseMedical className="h-4 w-4" />
            Create Space
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateFolder}
            className="flex items-center gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            Create Folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onImportSpace}
            className="flex items-center gap-2"
          >
            <FolderInput className="h-4 w-4" />
            Import Space
          </Button>
        </div>
      </div>
    </>
  );
}
