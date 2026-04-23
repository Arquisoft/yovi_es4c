Feature: Navigation and Profile
  Validate navigation bar, profile view and leaderboard

  # ── NAVEGACIÓN ────────────────────────────────────────────────────────────

  Scenario: Logged-in user sees the navigation bar
    Given the user is logged in and on the game page
    Then I should see the navigation bar
    And I should see the logout button

  Scenario: Logged-in user can log out
    Given the user is logged in and on the game page
    When I click the logout button
    Then I should be redirected to the login page

  # ── LEADERBOARD ───────────────────────────────────────────────────────────

  Scenario: User can navigate to the leaderboard
    Given the user is logged in and on the game page with leaderboard data
    When I navigate to the leaderboard
    Then I should see the leaderboard table

  Scenario: Leaderboard shows player entries
    Given the user is logged in and on the game page with leaderboard data
    When I navigate to the leaderboard
    Then I should see at least one leaderboard entry

  Scenario: Leaderboard pagination next button works
    Given the user is logged in and on the game page with leaderboard data
    When I navigate to the leaderboard
    And there is a next page available
    And I click the next page button
    Then I should see the second page of the leaderboard

  # ── PERFIL ────────────────────────────────────────────────────────────────

  Scenario: User can view their profile
    Given the user is logged in and on the game page with profile data
    When I navigate to the profile page
    Then I should see the profile stats section

  Scenario: Profile shows win rate
    Given the user is logged in and on the game page with profile data
    When I navigate to the profile page
    Then I should see a win rate displayed
