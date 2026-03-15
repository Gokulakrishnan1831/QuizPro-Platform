const ARRAY_SENTINEL_KEY = 'quizproArray';

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function encodeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => {
            if (Array.isArray(item)) {
                return {
                    [ARRAY_SENTINEL_KEY]: encodeValue(item),
                };
            }
            return encodeValue(item);
        });
    }

    if (isPlainObject(value)) {
        const out: Record<string, unknown> = {};
        for (const [key, nested] of Object.entries(value)) {
            out[key] = encodeValue(nested);
        }
        return out;
    }

    return value;
}

function decodeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => decodeValue(item));
    }

    if (isPlainObject(value)) {
        const keys = Object.keys(value);
        if (keys.length === 1 && keys[0] === ARRAY_SENTINEL_KEY) {
            const nested = (value as Record<string, unknown>)[ARRAY_SENTINEL_KEY];
            return Array.isArray(nested) ? nested.map((item) => decodeValue(item)) : [];
        }

        const out: Record<string, unknown> = {};
        for (const [key, nested] of Object.entries(value)) {
            out[key] = decodeValue(nested);
        }
        return out;
    }

    return value;
}

export function encodeFirestoreSafeDocument<T>(value: T): T {
    return encodeValue(value) as T;
}

export function decodeFirestoreSafeDocument<T>(value: T): T {
    return decodeValue(value) as T;
}
