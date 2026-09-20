/**
 * Runs the operation and hands back its error instead of throwing.
 * Counterpart of errorAsValue for synchronous calls such as JSON.parse.
 */
export function errorAsValueSync<T>(
    operation: () => T
): [T, undefined] | [undefined, Error] {
    // eslint-disable-next-line no-restricted-syntax
    try {
        return [operation(), undefined];
    } catch (err) {
        return [undefined, err as Error];
    }
}

export default async function errorAsValue<T>(
    promise: Promise<T>
): Promise<[T, undefined] | [undefined, Error]> {
    return promise
        .then(result => {
            return [result, undefined] as [T, undefined];
        })
        .catch(err => {
            return [undefined, err];
        });
}
