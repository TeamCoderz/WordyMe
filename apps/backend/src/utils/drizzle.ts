import { customType } from "drizzle-orm/sqlite-core";

export const enumType = <T extends readonly string[]>(values: T) => {
    return customType<{
        data: string;
        driverData: string;
    }>({
        dataType() {
            return "text";
        },
        toDriver(value) {
            if (!values.includes(value as any)) {
                throw new Error(`Invalid feedback type: ${value}`);
            }
            return value;
        }
    })().$type<T[number]>();
};
