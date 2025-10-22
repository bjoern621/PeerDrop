import errorAsValue from "./ErrorAsValue.ts";

interface RuntimeEnvVars {
    backendUrl: string;
    wsBackendUrl: string;
}

declare global {
    interface Window {
        __ENVVARS__?: RuntimeEnvVars;
    }
}

let promise: Promise<RuntimeEnvVars> | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeEnvVars> {
    if (promise) {
        throw new Error("Runtime config is already being loaded.");
    }

    if (window.__ENVVARS__) {
        throw new Error("Runtime config is already loaded.");
    }

    promise = (async () => {
        const [response, fetchError] = await errorAsValue(
            fetch("/envvars.json")
        );

        if (fetchError) {
            console.error("Failed to load runtime env vars:", fetchError);
            throw fetchError;
        }

        if (!response.ok) {
            const error = new Error(
                `Failed to fetch envvars.json: ${response.status} ${response.statusText}`
            );
            console.error(error);
            throw error;
        }

        const [config, jsonError] = await errorAsValue(
            response.json() as Promise<RuntimeEnvVars>
        );

        if (jsonError) {
            console.error("Failed to parse runtime env vars:", jsonError);
            throw jsonError;
        }

        window.__ENVVARS__ = config;
        return config;
    })();

    return promise;
}

export function getRuntimeEnvVars(): RuntimeEnvVars {
    if (!window.__ENVVARS__) {
        throw new Error(
            "Runtime config not loaded. Call loadRuntimeConfig() first."
        );
    }
    return window.__ENVVARS__;
}
