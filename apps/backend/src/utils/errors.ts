import { HttpException, HttpUnprocessableEntity, HttpValidationIssue } from "@httpx/exception";
import { ZodError } from "zod";

export const toHttpException = (error: unknown): HttpException => {
    if (error instanceof HttpException) {
        return error;
    }

    if (error instanceof ZodError) {
        return new HttpUnprocessableEntity({ // 422
            issues: error.issues as HttpValidationIssue[],
            cause: error,
        });
    }

    if (error instanceof Error) {
        return new HttpException(500, error.message);
    }

    return new HttpException(500, "Internal Server Error");
};