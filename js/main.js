import { LoginPage } from "./pages/login.page.js";
import { DashboardPage } from "./pages/dashboard.page.js";

LoginPage.init((user) => {
  LoginPage.hide();
  DashboardPage.show();
  DashboardPage.loadWeather();
  DashboardPage.setAccessLevel(user.access);
  DashboardPage.loadMenuIfAuthorized(user.access);
});
