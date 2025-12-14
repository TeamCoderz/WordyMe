import { ErrorRequestHandler, RequestHandler } from "express";
import { toHttpException } from "../utils/errors.js";
import { HttpNotFound } from "@httpx/exception";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);

    const httpException = toHttpException(err);

    res.status(httpException.statusCode).json(httpException);
};

export const notFoundHandler: RequestHandler = () => {
    throw new HttpNotFound();
};
