/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { getLatestRelease, refreshLatestRelease } from '../services/updates.js';

const router: Router = Router();

router.use(requireAuth);

router.get('/latest', async (_req, res, next) => {
  try {
    const cached = getLatestRelease();
    res.setHeader('Cache-Control', 'no-store');
    return res
      .status(200)
      .json(!cached.enabled || cached.checkedAt ? cached : await refreshLatestRelease());
  } catch (error) {
    return next(error);
  }
});

router.post('/check', async (_req, res, next) => {
  try {
    const release = await refreshLatestRelease();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(release);
  } catch (error) {
    return next(error);
  }
});

export { router as updatesRouter };
