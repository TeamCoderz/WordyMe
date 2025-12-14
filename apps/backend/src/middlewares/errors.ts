import { ErrorRequestHandler, RequestHandler } from "express";
import { toHttpException } from "../utils/errors.js";
import { HttpNotFound } from "@httpx/exception";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    console.error(err);

    const httpException = toHttpException(err);

    res.status(httpException.statusCode).json(httpException);
};

export const notFoundHandler: RequestHandler = (req, res, next) => {
    throw new HttpNotFound();
};
