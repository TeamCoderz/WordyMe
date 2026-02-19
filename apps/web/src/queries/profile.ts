/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useActions, useSelector } from '@/store';
import { updateUserImage, updateUserCover, deleteUserImage } from '@repo/sdk/storage.ts';
import { useMutation } from '@tanstack/react-query';
import { updateEditorSettings } from '@repo/sdk/editor-settings.ts';
import { toast } from 'sonner';
import { authClient, logout } from '@repo/sdk/auth';

export function useChangeAvatarMutation() {
  const user = useSelector((state) => state.user);
  const { setUser } = useActions();
  return useMutation({
    mutationKey: ['changeAvatar'],
    mutationFn: async ({
      image,
      x,
      y,
      width,
      height,
      zoom,
    }: {
      image: File;
      x: number;
      y: number;
      width: number;
      height: number;
      zoom: number;
    }) => {
      const { data, error } = await updateUserImage(image, {
        x,
        y,
        width,
        height,
        zoom,
      });
      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Uploading avatar...');
    },
    onSuccess: (data, __, toastId) => {
      toast.success('Avatar uploaded successfully', {
        id: toastId ?? undefined,
      });
      if (user) {
        setUser({
          ...user,
          avatar_image: data
            ? {
                url: data.url,
                height: data.meta.height ?? null,
                width: data.meta.width ?? null,
                x: data.meta.x ?? null,
                y: data.meta.y ?? null,
                zoom: data.meta.zoom ?? null,
                type: 'avatar',
                calculatedImage: user.avatar_image?.calculatedImage ?? null,
                isLoading: user.avatar_image?.isLoading ?? false,
                provider: 'supabase',
              }
            : undefined,
        });
      }
    },
    onError: (_, __, toastId) => {
      toast.error('Failed to upload avatar', {
        id: toastId ?? undefined,
      });
    },
  });
}
export function useChangeCoverMutation() {
  const user = useSelector((state) => state.user);
  const { setUser } = useActions();
  return useMutation({
    mutationKey: ['changeCover'],
    mutationFn: async ({
      image,
      x,
      y,
      width,
      height,
      zoom,
    }: {
      image: File;
      x: number;
      y: number;
      width: number;
      height: number;
      zoom: number;
    }) => {
      const { data, error } = await updateUserCover(image, {
        x,
        y,
        width,
        height,
        zoom,
      });
      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Uploading cover...');
    },
    onSuccess: (data, __, toastId) => {
      toast.success('Cover uploaded successfully', {
        id: toastId ?? undefined,
      });
      if (user) {
        setUser({
          ...user,
          cover_image: data
            ? {
                url: data.url,
                height: data.meta.height ?? null,
                width: data.meta.width ?? null,
                x: data.meta.x ?? null,
                y: data.meta.y ?? null,
                zoom: data.meta.zoom ?? null,
                type: 'cover',
                calculatedImage: user.cover_image?.calculatedImage ?? null,
                isLoading: user.cover_image?.isLoading ?? false,
              }
            : undefined,
        });
      }
    },
    onError: (_, __, toastId) => {
      toast.error('Failed to upload cover', {
        id: toastId ?? undefined,
      });
    },
  });
}
export function useUpdateCoverMetadataMutation() {
  return useMutation({
    mutationKey: ['updateCoverMetadata'],
    mutationFn: async (metadata: {
      x: number;
      y: number;
      width: number;
      height: number;
      zoom: number;
      type: 'cover';
    }) => {
      const { data, error } = await authClient.updateUser({ coverMeta: metadata });
      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Updating cover metadata...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Cover metadata updated successfully', {
        id: toastId ?? undefined,
      });
    },
    onError: (_, __, toastId) => {
      toast.error('Failed to update cover metadata', {
        id: toastId ?? undefined,
      });
    },
  });
}

export function useUpdateAvatarMetadataMutation() {
  return useMutation({
    mutationKey: ['updateAvatarMetadata'],
    mutationFn: async (metadata: {
      x: number;
      y: number;
      width: number;
      height: number;
      zoom: number;
      type: 'avatar';
    }) => {
      const { data, error } = await authClient.updateUser({ imageMeta: metadata });
      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Updating avatar metadata...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Avatar metadata updated successfully', {
        id: toastId ?? undefined,
      });
    },
    onError: (_, __, toastId) => {
      toast.error('Failed to update avatar metadata', {
        id: toastId ?? undefined,
      });
    },
  });
}

export function useDeleteAvatarMutation() {
  const user = useSelector((state) => state.user);
  const { setUser } = useActions();
  return useMutation({
    mutationKey: ['deleteAvatar'],
    mutationFn: async () => {
      const req = await deleteUserImage();
      if (req?.error) throw req.error;
      return;
    },
    onMutate() {
      return toast.loading('Deleting avatar...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Avatar deleted successfully', {
        id: toastId ?? undefined,
      });
      if (user) {
        setUser({ ...user, avatar_image: undefined });
      }
    },
    onError: (_, __, toastId) => {
      toast.error('Failed to delete avatar', {
        id: toastId ?? undefined,
      });
    },
  });
}

export function useDeleteProfileMutation() {
  return useMutation({
    mutationKey: ['deleteProfile'],
    mutationFn: async () => {
      const { data, error } = await authClient.deleteUser();

      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Deleting account...');
    },
    onSuccess: async (_, __, toastId) => {
      toast.success('Account deleted successfully', {
        id: toastId ?? undefined,
      });
      await logout();
    },
    onError: (_, __, toastId) => {
      toast.error('Failed to delete account', {
        id: toastId ?? undefined,
      });
    },
  });
}

export function useUpdateProfileMutation() {
  return useMutation({
    mutationKey: ['updateProfile'],
    mutationFn: async (
      payload: Partial<{
        name: string;
        bio?: string;
        avatar_url?: string;
        job_title?: string;
      }>,
    ) => {
      const updatePayload: Record<string, string> = {};
      if (payload.name) updatePayload.name = payload.name;
      if (payload.bio) updatePayload.bio = payload.bio;
      if (payload.job_title) updatePayload.jobTitle = payload.job_title;
      if (payload.avatar_url) updatePayload.image = payload.avatar_url;
      const { data, error } = await authClient.updateUser(updatePayload);
      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Updating profile...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Profile updated successfully', {
        id: toastId ?? undefined,
      });
    },
    onError: (_, __, toastId) => {
      toast.error('Failed to update profile', {
        id: toastId ?? undefined,
      });
    },
  });
}

export function useToggleKeepPreviousRevisionMutation() {
  const user = useSelector((state) => state.user);
  const { setUser } = useActions();
  return useMutation({
    mutationKey: ['toggleKeepPreviousRevision'],
    mutationFn: async (value: boolean) => {
      const { data, error } = await updateEditorSettings({
        keepPreviousRevision: value,
      });
      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Updating editor preferences...');
    },
    onSuccess: (data, __, toastId) => {
      toast.success('Editor preferences updated successfully', {
        id: toastId ?? undefined,
      });
      if (data && user) {
        setUser({
          ...user,
          editor_settings: data,
        });
      }
    },
    onError: (_err, __, toastId) => {
      toast.error('Failed to update editor preferences', {
        id: toastId ?? undefined,
      });
    },
  });
}

export function useToggleAutosaveMutation() {
  const user = useSelector((state) => state.user);
  const { setUser } = useActions();
  return useMutation({
    mutationKey: ['toggleAutosave'],
    mutationFn: async (value: boolean) => {
      const { data, error } = await updateEditorSettings({
        autosave: value,
      });
      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Updating editor preferences...');
    },
    onSuccess: (data, __, toastId) => {
      toast.success('Editor preferences updated successfully', {
        id: toastId ?? undefined,
      });
      if (data && user) {
        setUser({
          ...user,
          editor_settings: data,
        });
      }
    },
    onError: (_err, __, toastId) => {
      toast.error('Failed to update editor preferences', {
        id: toastId ?? undefined,
      });
    },
  });
}
