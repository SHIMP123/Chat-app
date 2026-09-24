import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password.js";

test("password hashes are salted and verify only the matching password", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");

    assert.notEqual(first, second);
    assert.equal(first.includes("correct horse battery staple"), false);
    assert.equal(await verifyPassword("correct horse battery staple", first), true);
    assert.equal(await verifyPassword("wrong password", first), false);
    assert.equal(await verifyPassword("correct horse battery staple", "correct horse battery staple"), false);
    assert.equal(await verifyPassword("correct horse battery staple", first.replace("scrypt$", "unknown$")), false);
});
