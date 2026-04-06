
  @wip
  Scenario: Player enters multiplayer lobby and sees connect button
    Given the user is logged in and on the game page
    When I select the "multiplayer" game mode
    And I click the start game button
    Then I should see the multiplayer lobby

  @wip
  Scenario: Player connects to a multiplayer room
    Given the user is logged in and on the game page
    When I select the "multiplayer" game mode
    And I click the start game button
    And the WebSocket server creates a room
    Then I should see the room ID displayed
    And I should see the chat panel

  @wip
  Scenario: Player sends a chat message in the lobby
    Given the user is in the multiplayer lobby with an active connection
    When I type "Hello opponent!" in the chat
    And I send the chat message
    Then the chat input should be cleared
