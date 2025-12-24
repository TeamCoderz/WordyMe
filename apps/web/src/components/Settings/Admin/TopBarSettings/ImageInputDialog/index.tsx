import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/dialog';
import { TopBarFormValues } from '@/schemas/top-bar-form.schema';
import { useFormContext } from 'react-hook-form';
import ImageInput from './ImageInput';
import { useEffect } from 'react';
import { useActions } from '@/store';
export default function ImageInputDialog() {
  const form = useFormContext<TopBarFormValues>();
  const preview = form.watch('instance_logo');
  const { setInstanceLogo } = useActions();
  useEffect(() => {
    setInstanceLogo(preview);
  }, [preview]);
  return (
    <Dialog>
      <DialogTrigger asChild>
        {preview ? (
          <img
            src={preview as string}
            alt="logo"
            width={50}
            height={50}
            className="object-center object-cover aspect-square rounded-full cursor-pointer hover:animate-pulse transition-all duration-300 hover:scale-105 active:scale-95"
          />
        ) : (
          <Button type="button">Change logo</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="sr-only">Change Logo</DialogTitle>
        <ImageInput />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant={'secondary'}>
              Close
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={() => {
              form.resetField('instance_logo');
              form.clearErrors('instance_logo');
            }}
          >
            Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
