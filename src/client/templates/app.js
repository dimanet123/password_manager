window.onload = () => {
  const action = document.getElementById("action");
  const form = document.getElementById("main-form");
  const output = document.getElementById("output");

  const newPassword = document.getElementById("new-password");
  const dataInput = document.getElementById("data-input");

  function updateFormFields(action) {
    newPassword.style.display = "none";
    dataInput.style.display = "none";

    if (action === "change-password") newPassword.style.display = "block";
    if (action === "update-data") {
      dataInput.style.display = "block";
    }
  }

  async function fetchAndRenderUsers() {
  try {
    const response = await fetch("api/get_all_users");
    const data = await response.json();

    const tbody = document.querySelector("#user-table tbody");
    tbody.innerHTML = "";  // очистить таблицу

    data.users.forEach(user => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${user.email}</td>
        <td>${user.salt}</td>
        <td><pre>${JSON.stringify(user.argon_params, null, 2)}</pre></td>
        <td><pre>${JSON.stringify(user.edek, null, 2)}</pre></td>
        <td><pre>${JSON.stringify(user.encrypted_data, null, 2)}</pre></td>
      `;

      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to fetch users", err);
  }
}
  fetchAndRenderUsers();

  updateFormFields(action.value);

  action.addEventListener("change", (e) => {
    updateFormFields(e.target.value);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const selectedAction = action.value;

    if (selectedAction === "register") {
      const salt = await generateSalt();
      const kek = await deriveKEK(password, salt);
      const dek = crypto.getRandomValues(new Uint8Array(32));

      // 🔐 1. Шифруем сам DEK с помощью KEK
      const { ciphertext: edek, nonce: edek_nonce } = await encryptDEK(dek, kek);

      // 🔐 2. Шифруем начальные пользовательские данные — например, "1"
      const { ciphertext, nonce } = await encryptWithDEK("1", dek);

      const data = {
        email,
        salt,
        argon_params: { time: 3, mem: 65536, parallelism: 1 },
        edek: {edek,        // зашифрованный DEK
        edek_nonce},  // nonce от шифрования DEK}
        encrypted_data: {
          ciphertext, // зашифрованная строка "1"
          nonce       // nonce от шифрования строки
        }
      };

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      output.textContent = res.ok
        ? `✅ Успешная регистрация!\nID пользователя: ${result.user_id}`
        : `❌ Ошибка: ${result.detail || "Неизвестная ошибка"}`;
    }

    if (selectedAction === "login") {
      const data = { email };

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      console.log(result)
      if (res.ok) {
        try {
          const kek = await deriveKEK(password, result.salt);

          // ⛔ Может упасть, если KEK неправильный
          const dek = await decryptDEK(result.edek.edek, result.edek.edek_nonce, kek);

          const decrypted = await decryptWithDEK(result.crypt_data.ciphertext, result.crypt_data.nonce, dek);

          output.textContent =
            `✅ Успешный вход\n\n🔓 Расшифрованные данные:\n${decrypted}`;
        } catch (err) {
          output.textContent = `❌ Неверный пароль или повреждённые данные`;
          console.warn("Ошибка расшифровки:", err);
        }
      } else {
        output.textContent = `❌ Ошибка входа: ${result.detail || "Неизвестная ошибка"}`;
      }
    }

    if (selectedAction === "change-password") {
      const data = { email };
      const newPassword = document.getElementById("new-password").value;

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      console.log(result.salt)
      if (res.ok) {
        try {
          const kek = await deriveKEK(password, result.salt);

          // ⛔ Может упасть, если KEK неправильный
          const dek = await decryptDEK(result.edek.edek, result.edek.edek_nonce, kek);

          const decrypted = await decryptWithDEK(result.crypt_data.ciphertext, result.crypt_data.nonce, dek);

          const salt = await generateSalt();

          console.log(newPassword);

          const kek2 = await deriveKEK(newPassword, salt);

          const { ciphertext: edek, nonce: edek_nonce } = await encryptDEK(dek, kek2);

          const { ciphertext, nonce } = await encryptWithDEK(decrypted, dek);

          const data = {
            email,
            salt,
            argon_params: { time: 3, mem: 65536, parallelism: 1 },
            edek: {edek,        // зашифрованный DEK
            edek_nonce},  // nonce от шифрования DEK}
            encrypted_data: {
              ciphertext, // зашифрованная строка "1"
              nonce       // nonce от шифрования строки
            }
          };

          const res = await fetch("/api/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          });




          output.textContent =
            `✅ Успешное изменение пароля`;
        } catch (err) {
          output.textContent = `❌ Неверный пароль или повреждённые данные`;
          console.warn("Ошибка расшифровки:", err);
        }
      } else {
        output.textContent = `❌ Ошибка входа: ${result.detail || "Неизвестная ошибка"}`;
      }
    }

    if (selectedAction === "update-data") {
      const data = { email };
      const newPassword = document.getElementById("new-password").value;

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      console.log(result.salt)
      if (res.ok) {
        try {
          const kek = await deriveKEK(password, result.salt);

          // ⛔ Может упасть, если KEK неправильный
          const dek = await decryptDEK(result.edek.edek, result.edek.edek_nonce, kek);

          decrypted = dataInput.value

          const salt = await generateSalt();

          console.log(newPassword);

          const kek2 = await deriveKEK(newPassword, salt);

          const { ciphertext, nonce } = await encryptWithDEK(decrypted, dek);

          const data = {
            email,
            encrypted_data: {
              ciphertext, // зашифрованная строка "1"
              nonce       // nonce от шифрования строки
            }
          };

          const res = await fetch("/api/update-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          });




          output.textContent =
            `✅ Успешное изменение данных`;
        } catch (err) {
          output.textContent = `❌ Неверный пароль или повреждённые данные`;
          console.warn("Ошибка расшифровки:", err);
        }
      } else {
        output.textContent = `❌ Ошибка входа: ${result.detail || "Неизвестная ошибка"}`;
      }
    }
  });
};
