// Dynamically detect base path (for local dev vs GitHub Pages)
export const basePath = window.location.hostname.includes("github.io")
  ? "/TerrasseTemp/"
  : "";
import { LoginPage } from "./pages/login.page.js";
import { DashboardPage } from "./pages/dashboard.page.js";

function initializeApp() {
  if (sessionStorage.getItem("keepLoggedIn") === "true") {
    sessionStorage.removeItem("keepLoggedIn");
    DashboardPage.show();
    DashboardPage.loadWeather();
    const access = sessionStorage.getItem("accessLevel") || "admin";
    sessionStorage.removeItem("accessLevel");
    DashboardPage.setAccessLevel(access);
    DashboardPage.loadMenuIfAuthorized(access);
  } else {
    LoginPage.init((user) => {
      LoginPage.hide();
      DashboardPage.show();
      DashboardPage.loadWeather();
      DashboardPage.setAccessLevel(user.access);
      DashboardPage.loadMenuIfAuthorized(user.access);
      sessionStorage.setItem("accessLevel", user.access);
    });
  }
}

initializeApp();
