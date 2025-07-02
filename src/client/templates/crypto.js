async function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

async function deriveKEK(password, saltBase64) {
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const result = await argon2.hash({
    pass: password,
    salt,
    time: 3,
    mem: 65536,
    parallelism: 1,
    hashLen: 32,
    type: argon2.ArgonType.Argon2id
  });
  return result.hash;
}

async function encryptDEK(dek, kek) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", kek, "AES-GCM", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, dek);
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    nonce: btoa(String.fromCharCode(...iv))
  };
}

// 🔐 Шифрование произвольной строки по DEK
async function encryptWithDEK(plaintext, dek) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", dek, "AES-GCM", false, ["encrypt"]);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    nonce: btoa(String.fromCharCode(...iv))
  };
}

// 🔓 Дешифровка строки по DEK
async function decryptWithDEK(ciphertextBase64, nonceBase64, dek) {
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(nonceBase64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", dek, "AES-GCM", false, ["decrypt"]);

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// 🔓 Дешифровка DEK по KEK
async function decryptDEK(encryptedBase64, nonceBase64, kek) {
  const ciphertext = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(nonceBase64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", kek, "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Uint8Array(decrypted); // это твой DEK
}

