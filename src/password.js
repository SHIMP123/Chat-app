import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const parameters = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password) {
    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, 64, parameters);
    return `scrypt$${parameters.N}$${parameters.r}$${parameters.p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
    const match = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([0-9a-f]{32})\$([0-9a-f]{128})$/.exec(storedHash ?? "");
    if (!match) return false;

    const [, N, r, p, salt, hash] = match;
    if (Number(N) !== parameters.N || Number(r) !== parameters.r || Number(p) !== parameters.p) return false;

    const expected = Buffer.from(hash, "hex");
    const actual = await scrypt(password, Buffer.from(salt, "hex"), expected.length, parameters);
    return timingSafeEqual(actual, expected);
}
