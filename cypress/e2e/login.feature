Feature: KontorTemp Login

  Scenario: Successful login
    Given I visit the KontorTemp app
    When I enter username "admin" and password "password"
    And I click the login button
    Then I should see the dashboard
