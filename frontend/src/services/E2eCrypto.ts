/**
 * End-to-end encryption for texts and transfer offers that travel through
 * the server. Each page load creates an ECDH P-256 key pair; the private key
 * never leaves the browser. Two clients derive the same AES-GCM key from
 * their own private key and the other side's public key, so the server only
 * forwards ciphertext.
 */

const HKDF_INFO = new TextEncoder().encode("peerdrop e2e v1");
const IV_BYTES = 12;

export interface Sealed {
    /** Base64 of the 12-byte AES-GCM nonce. */
    iv: string;
    /** Base64 of the AES-GCM output, tag included. */
    ciphertext: string;
}

export class E2eCrypto {
    private readonly keyPair: Promise<CryptoKeyPair>;
    private readonly publicKey: Promise<string>;
    // Shared keys per public key of the other side.
    private readonly sharedKeys = new Map<string, Promise<CryptoKey>>();

    public constructor() {
        this.keyPair = crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            false,
            ["deriveBits"]
        );
        this.publicKey = this.keyPair.then(async pair =>
            toBase64(await crypto.subtle.exportKey("raw", pair.publicKey))
        );
    }

    /** Base64 of this client's raw public key, as published to the server. */
    public getPublicKey(): Promise<string> {
        return this.publicKey;
    }

    public async seal(
        peerPublicKey: string,
        payload: unknown
    ): Promise<Sealed> {
        const key = await this.sharedKey(peerPublicKey);
        const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
        const plaintext = new TextEncoder().encode(JSON.stringify(payload));
        const ciphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            plaintext
        );
        return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
    }

    /** Rejects when the ciphertext was not sealed for this client. */
    public async open<T>(peerPublicKey: string, sealed: Sealed): Promise<T> {
        const key = await this.sharedKey(peerPublicKey);
        const plaintext = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: fromBase64(sealed.iv) },
            key,
            fromBase64(sealed.ciphertext)
        );
        return JSON.parse(new TextDecoder().decode(plaintext)) as T;
    }

    private sharedKey(peerPublicKey: string): Promise<CryptoKey> {
        let key = this.sharedKeys.get(peerPublicKey);
        if (!key) {
            key = this.deriveSharedKey(peerPublicKey);
            this.sharedKeys.set(peerPublicKey, key);
            // A malformed key must not poison the cache for a retry.
            key.catch(() => this.sharedKeys.delete(peerPublicKey));
        }
        return key;
    }

    private async deriveSharedKey(peerPublicKey: string): Promise<CryptoKey> {
        const { privateKey } = await this.keyPair;
        const peerKey = await crypto.subtle.importKey(
            "raw",
            fromBase64(peerPublicKey),
            { name: "ECDH", namedCurve: "P-256" },
            false,
            []
        );
        const secret = await crypto.subtle.deriveBits(
            { name: "ECDH", public: peerKey },
            privateKey,
            256
        );
        const hkdfKey = await crypto.subtle.importKey(
            "raw",
            secret,
            "HKDF",
            false,
            ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt: new Uint8Array(0),
                info: HKDF_INFO,
            },
            hkdfKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }
}

function toBase64(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
