Feature: Bot Game
  Validate the gameplay experience against the bot

  Scenario: Player makes a move and the bot responds
    Given the user is in a bot game with size 5
    When I click on an empty cell
    Then the board should be updated

  Scenario: Player wins the game
    Given the user is in a bot game with size 5
    When the game API returns a finished state with player winning
    And I click on an empty cell
    Then I should see the victory message

  Scenario: Player can return to menu during a game
    Given the user is in a bot game with size 5
    When I click the back to menu button
    Then I should see the game mode selector
