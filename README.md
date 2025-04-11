# TerrasseTemp

Et internt dashbord for kontormiljøet som viser dagens værdata, anbefalt tidspunkt for kaffepause ute, og dagens meny – med innlogging og tilgangsnivåer.

## Demo

https://joachimholseterbouvet.github.io/TerrasseTemp/

![image](https://github.com/user-attachments/assets/4f2ec927-7dc5-467a-a357-a0fabeffc4ec)



## Funksjoner

- Brukerinnlogging med tilgangsnivåer (`admin`, `level1`, `level2`, `level3`)  
- Live værdata fra [MET API](https://api.met.no/)
- Ikoner fra Yr/NRK [GitHub](https://github.com/nrkno/yr-weather-symbols)
- Kaffepause-anbefaling basert på temperatur, vind og sol  
- Temperaturgraf for dagen  
- Dagens meny (hentet fra ekstern API)  

## Testing med BDD (Cypress + Cucumber)

Prosjektet benytter **Cypress** og **Cucumber** for behavior-driven testing.  
Eksempel på feature-fil:

```gherkin
Feature: Login
  Scenario: User logs in successfully
    Given I visit the TerrasseTemp app
    When I enter username "admin" and password "password"
    And I click the login button
    Then I should see the dashboard
```

Step-definisjoner er implementert i `login.steps.js`.

## Teknisk struktur

- `index.html` og `dashboard.html` — Frontend UI
- `main.js` — Initialisering og routing
- `login.page.js` & `dashboard.page.js` — Page Object Model for interaksjon
- `styles.css` — Stiler og layout
- `login.feature` + `login.steps.js` — BDD-tester
- `loginPage.ts` — TypeScript-versjon av login POM (for testing med Cypress)

## Teknologier brukt

- HTML, CSS, JS (ES6 modules)
- TypeScript (kun for test-POM)
- Bootstrap 5
- ECharts
- Cypress + Cucumber
- MET Locationforecast API
- Generative AI modeller som ChatGPT, Grok og Gemeni

## Standardbruker

```text
Brukernavn: admin
Passord: password
```

*Brukes kun for lokal testing – brukere lastes fra `users.json` i produksjon.*

## Lisens

[MIT](https://choosealicense.com/licenses/mit/)
