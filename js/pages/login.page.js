import { basePath } from "../main.js";

export const LoginPage = {
  init(onLogin) {
    document.getElementById("login-button").addEventListener("click", () => {
      const username = LoginPage.getUsername();
      const password = LoginPage.getPassword();
      LoginPage.verifyUser(username, password, onLogin);
    });

    document.getElementById("password").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const username = LoginPage.getUsername();
        const password = LoginPage.getPassword();
        LoginPage.verifyUser(username, password, onLogin);
      }
    });
  },

  getUsername() {
    return document.getElementById("username").value;
  },

  getPassword() {
    return document.getElementById("password").value;
  },

  showError() {
    document.getElementById("login-error").classList.remove("d-none");
  },

  hide() {
    document.getElementById("login-page").style.display = "none";
  },

  show() {
    document.getElementById("login-page").style.display = "block";
    document.getElementById("password").value = "";
  },

  async verifyUser(username, password, onLogin) {
    try {
      const res = await fetch(`${basePath}users.json`);
      const users = await res.json();
      const user = users.find(
        (user) => user.username === username && user.password === password
      );

      if (user) {
        onLogin(user); // pass entire user object
      } else {
        LoginPage.showError();
      }
    } catch (err) {
      console.error("Error loading users.json:", err);
      LoginPage.showError();
    }
  },
};
