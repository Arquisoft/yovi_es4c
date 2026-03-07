package com.yovi.gateway.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

/**
 * Enruta las peticiones del servicio de juego (gamey).
 *
 * Rutas proxadas:
 *  - GET  /status                          → gamey:4000/status
 *  - POST /v1/ybot/choose/{botId}          → gamey:4000/v1/ybot/choose/{botId}
 *  - POST /v1/game/play                    → gamey:4000/v1/game/play
 */
@RestController
public class GameyController {

    private final RestTemplate restTemplate;
    private final String gameyUrl;

    public GameyController(RestTemplate restTemplate,
                           @Value("${gateway.gamey.url}") String gameyUrl) {
        this.restTemplate = restTemplate;
        this.gameyUrl = gameyUrl;
    }

    @GetMapping("/status")
    public ResponseEntity<String> status() {
        try {
            return restTemplate.getForEntity(gameyUrl + "/status", String.class);
        } catch (HttpStatusCodeException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        }
    }

    @PostMapping("/v1/ybot/choose/{botId}")
    public ResponseEntity<String> chooseBotMove(@PathVariable String botId,
                                                @RequestBody String body) {
        String url = gameyUrl + "/v1/ybot/choose/" + botId;
        return forwardPost(url, body);
    }

    @PostMapping("/v1/game/play")
    public ResponseEntity<String> playMove(@RequestBody String body) {
        return forwardPost(gameyUrl + "/v1/game/play", body);
    }

    private ResponseEntity<String> forwardPost(String url, String body) {
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<String> entity = 
                new org.springframework.http.HttpEntity<>(body, headers);
            return restTemplate.postForEntity(url, entity, String.class);
        } catch (HttpStatusCodeException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        }
    }
}
