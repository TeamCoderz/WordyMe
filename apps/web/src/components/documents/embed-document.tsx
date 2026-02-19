/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const EmbedDocument: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="relative flex flex-1 flex-col p-4 w-full max-w-7xl mx-auto">
      <div className="viewer-container">{children}</div>
    </div>
  );
};

export default EmbedDocument;
