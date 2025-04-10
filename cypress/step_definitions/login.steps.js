import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

Given("I visit the KontorTemp app", () => {
  cy.visit("/");
});

When(
  "I enter username {string} and password {string}",
  (username, password) => {
    cy.get("#username").clear().type(username);
    cy.get("#password").clear().type(password);
  }
);

When("I click the login button", () => {
  cy.get("#login-button").click();
});

Then("I should see the dashboard", () => {
  cy.get("#dashboard").should("be.visible");
  cy.get("#main").should("exist");
  cy.get("#line-chart").should("exist");
});
