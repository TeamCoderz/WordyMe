import { customType } from "drizzle-orm/sqlite-core";

export const enumType = <T extends readonly string[]>(values: T, name?: string) => {
    const custom = customType<{
        data: string;
        driverData: string;
    }>({
        dataType() {
            return "text";
        },
        toDriver(value) {
            if (!values.includes(value as any)) {
                throw new Error(`Invalid enum value: ${value}. Allowed values are: ${values.join(", ")}`);
            }
            return value;
        }
    })
    return name ? custom(name).$type<T[number]>() : custom().$type<T[number]>()
};
