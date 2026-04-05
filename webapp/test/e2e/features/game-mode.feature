Feature: Game Mode Selection
  Validate the game mode selector page that appears before starting a game

  Scenario: Player selects bot mode and starts a game
    Given the user is logged in and on the game page
    When I select the "bot" game mode
    And I click the start game button
    Then I should see the bot game board

  Scenario: Player selects multiplayer mode
    Given the user is logged in and on the game page
    When I select the "multiplayer" game mode
    Then I should see the multiplayer lobby

  Scenario: Player changes board size before starting
    Given the user is logged in and on the game page
    When I increase the board size twice
    And I click the start game button
    Then I should see the bot game board

  Scenario: Player selects bot starts first option
    Given the user is logged in and on the game page
    When I select the "bot" game mode
    And I choose that the bot starts first
    And I click the start game button
    Then I should see the bot game board
