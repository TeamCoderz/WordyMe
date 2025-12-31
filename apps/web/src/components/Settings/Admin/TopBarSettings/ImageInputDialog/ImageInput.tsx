'use client';
import { FormControl } from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { logoImageFileSchema } from '@/schemas/logo-image-file.schema';
import { TopBarFormValues } from '@/schemas/top-bar-form.schema';
import { ImagePlus } from '@repo/ui/components/icons';
import { useCallback } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';

export default function ImageInput() {
  const form = useFormContext<TopBarFormValues>();
  const preview = form.watch('instance_logo');
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await logoImageFileSchema.parseAsync(acceptedFiles[0]);
          form.setValue('instance_logo', reader.result as string, {
            shouldDirty: true,
          });
          form.clearErrors('instance_logo');
          await form.trigger('instance_logo');
        } catch (error) {
          form.resetField('instance_logo');
          if (error instanceof z.ZodError) {
            form.setError('instance_logo', error.issues[0]);
          } else {
            if (error instanceof Error) {
              form.setError('instance_logo', {
                message: error.message,
                type: 'max',
              });
            }
          }
        }
      };

      if (acceptedFiles.length < 1 && fileRejections.length > 0) {
        return form.setError('instance_logo', {
          message: 'Please select a file with a size of less than 5MB.',
        });
      }

      reader.readAsDataURL(acceptedFiles[0]);
    },
    [form],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 5000000,
    accept: {
      'image/png': [],
      'image/jpg': [],
      'image/jpeg': [],
      'image/gif': [],
      'image/webp': [],
      'image/svg+xml': [],
    },
  });
  return (
    <FormControl>
      <div
        {...getRootProps()}
        className="mx-auto flex cursor-pointer flex-col items-center justify-center gap-y-2 rounded-lg border-2 border-foreground border-dashed p-8 "
      >
        {preview && (
          <img
            src={preview as string}
            alt="Uploaded image"
            className="rounded-full w-[200px] h-[200px] aspect-square object-cover object-center"
            width={300}
            height={300}
          />
        )}
        <ImagePlus className={`size-40 ${preview ? 'hidden' : 'block'}`} />
        <Input {...getInputProps()} type="file" />
        {!preview &&
          (isDragActive ? <p>Drop the image!</p> : <p>Click here or drag an image to upload it</p>)}
      </div>
    </FormControl>
  );
}
