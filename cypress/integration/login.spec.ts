import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import { loginPage } from "../support/pageObjects/loginPage";

Given("the user navigates to the login page", () => {
  loginPage.visit();
});

When("the user enters valid credentials", () => {
  loginPage.enterUsername("admin");
  loginPage.enterPassword("password");
});

When("clicks the login button", () => {
  loginPage.submitLogin();
});

Then("the user should be redirected to the dashboard", () => {
  cy.url().should("include", "/dashboard");
  cy.get("h1").should("contain.text", "Welcome to the Dashboard!");
});
