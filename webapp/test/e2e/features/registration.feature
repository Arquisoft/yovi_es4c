Feature: User Registration
  Validate user registration flow end to end

  # Tras login/registro la app navega a GameView en fase 'selector' (GameModeSelector),
  # NO directamente al tablero. Por eso los escenarios comprueban btn-start-game.

  Scenario: Successful registration navigates to the game selector
    Given the register page is open
    When I enter "Alice" as the username and submit
    Then I should see the game mode selector

  Scenario: Registration with different user also reaches the game selector
    Given the register page is open
    When I enter "Bob" as the username and submit
    Then I should see the game mode selector

  Scenario: Login form is visible on landing page
    Given the app is open at the home page
    Then I should see the username input field
    And I should see the password input field
    And I should see the submit button

  Scenario: Invalid login shows error
    Given the app is open at the home page with a failing login
    When I enter "WrongUser" as the username and submit
    Then I should see an error message on the login form
