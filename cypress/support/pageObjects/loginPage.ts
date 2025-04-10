class LoginPage {
  visit() {
    cy.visit("http://localhost:3000");
  }

  enterUsername(username: string) {
    cy.get("#username").type(username);
  }

  enterPassword(password: string) {
    cy.get("#password").type(password);
  }

  submitLogin() {
    cy.get("#login-button").click();
  }
}

export const loginPage = new LoginPage();
