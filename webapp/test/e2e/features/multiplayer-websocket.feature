Feature: Multiplayer WebSocket
  Validate the full WebSocket lifecycle for the multiplayer game mode

  # ── LOBBY: CREAR SALA ──────────────────────────────────────────────────────

  Scenario: Player creates a room and sees the room code
    Given the user is logged in and on the game page
    When I select the "multiplayer" game mode
    And I click the start game button
    And I click the create room button
    Then I should see a room code of 6 characters
    And I should see the waiting screen

  Scenario: Player copies the room code to clipboard
    Given the user is in the multiplayer lobby waiting state
    When I click the copy room code button
    Then the copy confirmation message should appear

  Scenario: Player disconnects from a waiting room
    Given the user is in the multiplayer lobby waiting state
    When I click the disconnect button
    Then I should see the game mode selector

  # ── LOBBY: UNIRSE A SALA ───────────────────────────────────────────────────

  Scenario: Player switches to the join tab
    Given the user is logged in and on the game page
    When I select the "multiplayer" game mode
    And I click the start game button
    And I switch to the join room tab
    Then I should see the join code input field

  Scenario: Player joins a room with a valid code
    Given the user is logged in and on the game page
    When I select the "multiplayer" game mode
    And I click the start game button
    And I switch to the join room tab
    And I enter the room code "TST001"
    And I click the join room button
    Then the game should start with an opponent named "Rival"

  Scenario: Join button is disabled when code is too short
    Given the user is logged in and on the game page
    When I select the "multiplayer" game mode
    And I click the start game button
    And I switch to the join room tab
    And I enter the room code "AB"
    Then the join room button should be disabled

  Scenario: Player joins via keyboard Enter key
    Given the user is logged in and on the game page
    When I select the "multiplayer" game mode
    And I click the start game button
    And I switch to the join room tab
    And I enter the room code "TST001"
    And I press Enter in the code input
    Then the game should start with an opponent named "Rival"

  # ── PARTIDA EN CURSO ───────────────────────────────────────────────────────

  Scenario: The game board is visible once the game starts
    Given both players are connected and the game has started
    Then I should see the multiplayer game board
    And I should see the game status indicator

  Scenario: Player can make a move on their turn
    Given both players are connected and the game has started as player index 0
    When I click on a cell in the multiplayer board
    Then the board should reflect the move

  Scenario: Player cannot interact when it is the opponent's turn
    Given both players are connected and the game has started as player index 1
    Then the board cells should not be interactive

  Scenario: Opponent move updates the board via WebSocket
    Given both players are connected and the game has started as player index 1
    When the server sends a board_update message
    Then the board layout should be updated

  Scenario: Game finishes and victory message is shown to the winner
    Given both players are connected and the game has started as player index 0
    When the server sends a game_over message with winner 0
    Then I should see the victory status in the multiplayer game
    And the back to lobby button should be visible

  Scenario: Game finishes and defeat message is shown to the loser
    Given both players are connected and the game has started as player index 1
    When the server sends a game_over message with winner 0
    Then I should see the defeat status in the multiplayer game

  Scenario: Player can leave the game mid-game
    Given both players are connected and the game has started
    When I click the leave game button
    Then I should see the game mode selector

  # ── CHAT ──────────────────────────────────────────────────────────────────

  Scenario: Player sends a chat message during the game
    Given both players are connected and the game has started
    When I type "Buena suerte!" in the multiplayer chat
    And I click the send chat button
    Then the chat message "Buena suerte!" should appear in the chat box
    And the chat input should be empty

  Scenario: Player sends a chat message using Enter key
    Given both players are connected and the game has started
    When I type "Hola!" in the multiplayer chat
    And I press Enter in the chat input
    Then the chat message "Hola!" should appear in the chat box

  Scenario: Incoming chat message from opponent is displayed
    Given both players are connected and the game has started
    When the server sends a chat message from "Rival" saying "Buen movimiento"
    Then the message "Buen movimiento" from "Rival" should appear in the chat box

  Scenario: Empty chat messages cannot be sent
    Given both players are connected and the game has started
    Then the send chat button should be disabled when the input is empty

  # ── ERRORES Y CASOS LÍMITE ────────────────────────────────────────────────

  Scenario: Error message shown when joining a non-existent room
    Given the user is logged in and on the game page
    When I select the "multiplayer" game mode
    And I click the start game button
    And I switch to the join room tab
    And the WebSocket responds with a room not found error
    And I enter the room code "NOEXIS"
    And I click the join room button
    Then I should see the WebSocket error alert

  Scenario: Error shown when opponent disconnects mid-game
    Given both players are connected and the game has started
    When the server sends a disconnection error message
    Then I should see the WebSocket error alert
