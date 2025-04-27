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
