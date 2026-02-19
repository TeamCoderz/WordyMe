/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/dialog';
import { FileUploader, FileInput } from '@repo/ui/components/image-file-input';
import { CloudUpload } from '@repo/ui/components/icons';
import { useState } from 'react';
import AvatarCropper from './AvatarCropper';

interface ChangeAvatarDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function ChangeAvatarDialog({ open, setOpen }: ChangeAvatarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Change Avatar</Button>
      </DialogTrigger>
      <DialogContent>
        <ChangeAvatarDialogContent onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

const ChangeAvatarDialogContent = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [image, setImage] = useState<string | null>(null);

  return (
    <>
      {step === 1 && <ChangeAvatarFirstStep setStep={setStep} setImage={setImage} />}
      {step === 2 && (
        <AvatarCropper
          image={image}
          isNewUpload={true}
          onBack={() => setStep(1)}
          onClose={onClose}
        />
      )}
    </>
  );
};

const ChangeAvatarFirstStep = ({
  setStep,
  setImage,
}: {
  setStep: (step: 1 | 2) => void;
  setImage: (image: string) => void;
}) => {
  const [file, setFile] = useState<File[] | null>(null);

  const dropZoneConfig = {
    maxFiles: 1,
    maxSize: 1024 * 1024 * 10,
    multiple: false,
  };

  // Auto-proceed to step 2 when file is selected
  const handleFileChange = (files: File[] | null) => {
    setFile(files);
    if (files && files.length > 0) {
      const f = files[0];
      const url = URL.createObjectURL(f);
      setImage(url);
      // Auto-proceed after a brief delay for visual feedback
      setTimeout(() => setStep(2), 300);
    }
  };

  return (
    <>
      <DialogTitle className="mb-5">Select image</DialogTitle>
      <FileUploader
        value={file}
        onValueChange={handleFileChange}
        dropzoneOptions={dropZoneConfig}
        className="relative bg-background rounded-lg p-2"
      >
        <FileInput className=" border border-dashed border-black dark:border-gray-200 bg-[#f0f0f0] dark:bg-black !p-0">
          <div className="flex items-center justify-center flex-col py-7 px-2 w-full ">
            <FileSvgDraw />
          </div>
        </FileInput>
      </FileUploader>

      <DialogFooter className="flex !justify-end">
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          onClick={() => {
            const f = file?.[0];
            if (!f) return;
            const url = URL.createObjectURL(f);
            setImage(url);
            setStep(2);
          }}
          disabled={!file || file.length === 0}
        >
          Next
        </Button>
      </DialogFooter>
    </>
  );
};

const FileSvgDraw = () => {
  return (
    <>
      <CloudUpload className="size-10 mb-3" />
      <p className="mb-2.5 text-sm font-medium text-foreground">Drag and drop to upload</p>
      <p className="text-xs text-muted-foreground mb-6">Supports JPG, JPEG, PNG</p>
      <Button variant="outline">Upload File</Button>
    </>
  );
};
