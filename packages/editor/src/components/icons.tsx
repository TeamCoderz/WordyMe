/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { BlockType } from '@repo/editor/store';
import type { HorizontalRuleVariant } from '@repo/editor/nodes/HorizontalRuleNode';
import {
  PilcrowIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ListIcon,
  ListTodoIcon,
  ListOrderedIcon,
  BracesIcon,
  QuoteIcon,
  LucideProps,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  ScanIcon,
  SquareIcon,
  PencilOffIcon,
  PencilIcon,
} from '@repo/ui/components/icons';
import type { ElementFormatType } from 'lexical';
import { DetailsVariant } from '@repo/editor/nodes/DetailsNode';
import type { ComponentProps } from 'react';

export const TextAlignIcon = ({
  formatType,
  ...props
}: LucideProps & { formatType?: ElementFormatType }) => {
  switch (formatType) {
    case 'left':
      return <AlignLeftIcon {...props} />;
    case 'center':
      return <AlignCenterIcon {...props} />;
    case 'right':
      return <AlignRightIcon {...props} />;
    case 'justify':
      return <AlignJustifyIcon {...props} />;
    default:
      return <AlignLeftIcon {...props} />;
  }
};

export const FormatImageRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M450-285v-390h390v390H450Zm60-60h270v-270H510v270ZM120-120v-60h720v60H120Zm0-165v-60h270v60H120Zm0-165v-60h270v60H120Zm0-165v-60h270v60H120Zm0-165v-60h720v60H120Z" />
  </svg>
);
export const FormatImageLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M120-285v-390h390v390H120Zm60-60h270v-270H180v270Zm-60-435v-60h720v60H120Zm450 165v-60h270v60H570Zm0 165v-60h270v60H570Zm0 165v-60h270v60H570ZM120-120v-60h720v60H120Z" />
  </svg>
);

export const CellMergeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M120-120v-240h80v160h160v80H120Zm480 0v-80h160v-160h80v240H600ZM287-327l-57-56 57-57H80v-80h207l-57-57 57-56 153 153-153 153Zm386 0L520-480l153-153 57 56-57 57h207v80H673l57 57-57 56ZM120-600v-240h240v80H200v160h-80Zm640 0v-160H600v-80h240v240h-80Z" />
  </svg>
);

export const TextRotationNoneIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M160-200v-80h528l-42-42 56-56 138 138-138 138-56-56 42-42H160Zm116-200 164-440h80l164 440h-76l-38-112H392l-40 112h-76Zm138-176h132l-64-182h-4l-64 182Z" />
  </svg>
);

export const TextRotationVerticalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="m436-320 164-440h80l164 440h-76l-40-112H552l-40 112h-76Zm138-176h132l-64-182h-4l-64 182ZM240-160 100-300l56-56 44 42v-526h80v526l44-42 56 56-140 140Z" />
  </svg>
);

export const AddRowAboveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M200-160h560v-240H200v240Zm640 80H120v-720h160v80h-80v240h560v-240h-80v-80h160v720ZM480-480Zm0 80v-80 80Zm0 0Zm-40-240v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
  </svg>
);

export const AddRowBelowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M200-560h560v-240H200v240Zm-80 400v-720h720v720H680v-80h80v-240H200v240h80v80H120Zm360-320Zm0-80v80-80Zm0 0ZM440-80v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
  </svg>
);

export const AddColumnLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M800-200v-560H560v560h240Zm-640 80v-160h80v80h240v-560H240v80h-80v-160h720v720H160Zm320-360Zm80 0h-80 80Zm0 0ZM160-360v-80H80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
  </svg>
);

export const AddColumnRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M160-760v560h240v-560H160ZM80-120v-720h720v160h-80v-80H480v560h240v-80h80v160H80Zm400-360Zm-80 0h80-80Zm0 0Zm320 120v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z" />
  </svg>
);

export const RemoveRowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M560-280H120v-400h720v120h-80v-40H200v240h360v80Zm-360-80v-240 240Zm440 104 84-84-84-84 56-56 84 84 84-84 56 56-83 84 83 84-56 56-84-83-84 83-56-56Z" />
  </svg>
);

export const RemoveColumnIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
    style={{ transform: 'rotate(90deg)' }}
  >
    <path d="M560-280H120v-400h720v120h-80v-40H200v240h360v80Zm-360-80v-240 240Zm440 104 84-84-84-84 56-56 84 84 84-84 56 56-83 84 83 84-56 56-84-83-84 83-56-56Z" />
  </svg>
);

export const RemoveRowHeaderIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
  >
    <path d="M120-280v-400h720v400H120Zm80-80h560v-240H200v240Zm0 0v-240 240Z" />
  </svg>
);

export const RemoveColumnHeaderIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
    style={{ transform: 'rotate(90deg)' }}
  >
    <path d="M120-280v-400h720v400H120Zm80-80h560v-240H200v240Zm0 0v-240 240Z" />
  </svg>
);

export const AddRowHeaderIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
    style={{ transform: 'rotate(45deg)' }}
  >
    <path d="m272-104-38-38-42 42q-19 19-46.5 19.5T100-100q-19-19-19-46t19-46l42-42-38-40 554-554q12-12 29-12t29 12l112 112q12 12 12 29t-12 29L272-104Zm172-396L216-274l58 58 226-228-56-56Z" />
  </svg>
);

export const AddColumnHeaderIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 -960 960 960"
    fill="currentColor"
    style={{ transform: 'rotate(-45deg)' }}
  >
    <path d="m272-104-38-38-42 42q-19 19-46.5 19.5T100-100q-19-19-19-46t19-46l42-42-38-40 554-554q12-12 29-12t29 12l112 112q12 12 12 29t-12 29L272-104Zm172-396L216-274l58 58 226-228-56-56Z" />
  </svg>
);

export const WolframIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" className="h-4 w-4">
    <path
      d="M15.33 10l2.17-2.47-3.19-.71.33-3.29-3 1.33L10 2 8.35 4.86l-3-1.33.32 3.29-3.17.71L4.67 10 2.5 12.47l3.19.71-.33 3.29 3-1.33L10 18l1.65-2.86 3 1.33-.32-3.29 3.19-.71zm-2.83 1.5h-5v-1h5zm0-2h-5v-1h5z"
      fill="currentColor"
    ></path>
  </svg>
);

export const HorizontalRuleIcon = ({ variant }: { variant: HorizontalRuleVariant }) => {
  switch (variant) {
    case 'single':
      return <div className="w-4 border-t border-solid border-foreground" />;
    case 'dashed':
      return <div className="w-4 border-t border-dashed border-foreground" />;
    case 'dotted':
      return <div className="w-4 border-t border-dotted border-foreground" />;
    case 'double':
      return <div className="w-4 border-t-4 border-double border-foreground" />;
  }
};

export function BlockTypeIcon({
  type,
  ...props
}: LucideProps & {
  type: BlockType;
}) {
  switch (type) {
    case 'paragraph':
      return <PilcrowIcon {...props} />;
    case 'h1':
      return <Heading1Icon {...props} />;
    case 'h2':
      return <Heading2Icon {...props} />;
    case 'h3':
      return <Heading3Icon {...props} />;
    case 'h4':
      return <Heading4Icon {...props} />;
    case 'h5':
      return <Heading5Icon {...props} />;
    case 'h6':
      return <Heading6Icon {...props} />;
    case 'number':
      return <ListOrderedIcon {...props} />;
    case 'bullet':
      return <ListIcon {...props} />;
    case 'check':
      return <ListTodoIcon {...props} />;
    case 'code':
      return <BracesIcon {...props} />;
    case 'quote':
      return <QuoteIcon {...props} />;
    default:
      return <PilcrowIcon {...props} />;
  }
}

export const DetailsVariantIcon = ({
  variant,
  ...props
}: LucideProps & {
  variant: DetailsVariant;
}) => {
  switch (variant) {
    case 'sharp':
      return <SquareIcon {...props} />;
    case 'rounded':
      return <ScanIcon {...props} />;
  }
};

export const DetailsEditableIcon = ({
  editable,
  ...props
}: LucideProps & {
  editable: boolean;
}) => {
  return editable ? <PencilIcon {...props} /> : <PencilOffIcon {...props} />;
};

export const YoutubeIcon = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
