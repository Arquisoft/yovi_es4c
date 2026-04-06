Feature: Register
  Validate the register form

  @wip
  Scenario: Successful registration
    Given the register page is open
    When I enter "Alice" as the username and submit
