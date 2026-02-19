/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { drizzle } from 'drizzle-orm/libsql';
import { env } from '../env.js';
import * as schema from '../models/index.js';

export const db = drizzle(env.DB_FILE_NAME, { schema });
