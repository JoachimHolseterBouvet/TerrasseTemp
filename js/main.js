// Dynamically detect base path (for local dev vs GitHub Pages)
export const basePath = window.location.hostname.includes("github.io")
  ? "/TerrasseTemp/"
  : "";
import { LoginPage } from "./pages/login.page.js";
import { DashboardPage } from "./pages/dashboard.page.js";

LoginPage.init((user) => {
  LoginPage.hide();
  DashboardPage.show();
  DashboardPage.loadWeather();
  DashboardPage.setAccessLevel(user.access);
  DashboardPage.loadMenuIfAuthorized(user.access);
});
