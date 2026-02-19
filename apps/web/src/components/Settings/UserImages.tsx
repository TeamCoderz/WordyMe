/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import CoverImage from '@/components/Settings/UserImages/CoverImage';
import AvatarControls from '@/components/Settings/UserImages/AvatarControls';

export default function UserImages() {
  return (
    <div className="mb-10">
      <CoverImage />
      <AvatarControls />
    </div>
  );
}
