package com.yovi.gateway.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

/**
 * Enruta las peticiones del servicio de usuarios.
 *
 * Rutas proxadas:
 *  - POST /createuser       → users:3000/createuser
 *  - POST /login            → users:3000/login
 *  - GET  /api/games        → users:3000/api/games
 *  - POST /api/games        → users:3000/api/games
 *  - POST /api/games/seed   → users:3000/api/games/seed
 *  - GET  /api/leaderboard     → users:3000/api/leaderboard
 */
@RestController
public class UsersController {

    private final RestTemplate restTemplate;
    private final String usersUrl;

    public UsersController(RestTemplate restTemplate,
                           @Value("${gateway.users.url}") String usersUrl) {
        this.restTemplate = restTemplate;
        this.usersUrl = usersUrl;
    }

    @GetMapping("/api/games")
    public ResponseEntity<String> getGames() {
        return forward(usersUrl + "/api/games", "GET", null);
    }

    @PostMapping("/api/games")
    public ResponseEntity<String> saveGame(@RequestBody String body) {
        return forward(usersUrl + "/api/games", "POST", body);
    }

    @PostMapping("/api/games/seed")
    public ResponseEntity<String> seedGames(@RequestBody(required = false) String body) {
        return forward(usersUrl + "/api/games/seed", "POST", body);
    }

    @GetMapping("/api/users/{userId}/stats")
    public ResponseEntity<String> getUserStats(@PathVariable String userId) {
        return forward(usersUrl + "/api/users/" + userId + "/stats", "GET", null);
    }
    @GetMapping("/api/leaderboard")
    public ResponseEntity<String> getLeaderboard(
            @RequestParam(defaultValue = "20")  int limit,
            @RequestParam(defaultValue = "0")   int offset) {
        String url = usersUrl + "/api/leaderboard?limit=" + limit + "&offset=" + offset;
        try {
            return restTemplate.getForEntity(url, String.class);
        } catch (HttpStatusCodeException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        }
    }

    private ResponseEntity<String> forward(String url, String method, String body) {
        try {
            if ("GET".equals(method)) {
                return restTemplate.getForEntity(url, String.class);
            } else {
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                org.springframework.http.HttpEntity<String> entity =
                        new org.springframework.http.HttpEntity<>(body, headers);
                return restTemplate.postForEntity(url, entity, String.class);
            }
        } catch (HttpStatusCodeException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        }
    }
}
