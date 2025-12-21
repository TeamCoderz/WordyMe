import PQueue from "p-queue";

export const dbWritesQueue = new PQueue({ concurrency: 1 });
