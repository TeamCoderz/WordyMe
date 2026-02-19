/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import server from './app.js';
import { env } from './env.js';

server.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
