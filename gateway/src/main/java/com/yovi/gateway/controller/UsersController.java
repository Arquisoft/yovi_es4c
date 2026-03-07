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
 *  - GET  /api/games        → users:3000/api/games
 *  - POST /api/games        → users:3000/api/games
 *  - POST /api/games/seed   → users:3000/api/games/seed
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

    @PostMapping("/createuser")
    public ResponseEntity<String> createUser(@RequestBody String body) {
        return forward(usersUrl + "/createuser", "POST", body);
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

    private ResponseEntity<String> forward(String url, String method, String body) {
        try {
            if ("GET".equals(method)) {
                return restTemplate.getForEntity(url, String.class);
            } else {
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(body, headers);
                return restTemplate.postForEntity(url, entity, String.class);
            }
        } catch (HttpStatusCodeException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        }
    }
}
