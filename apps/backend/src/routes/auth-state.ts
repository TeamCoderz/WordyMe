/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Router } from 'express';
import { isSignupEnabled } from '../lib/auth.js';

export const authStateRouter = Router();

authStateRouter.get('/signup-availability', async (_req, res, next) => {
  try {
    const signupEnabled = await isSignupEnabled();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ signupEnabled });
  } catch (error) {
    return next(error);
  }
});
