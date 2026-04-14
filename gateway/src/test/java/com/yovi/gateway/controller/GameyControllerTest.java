package com.yovi.gateway.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import com.yovi.gateway.config.CorsConfig;
import com.yovi.gateway.config.RestTemplateConfig;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.security.test.context.support.WithMockUser;

@WebMvcTest(GameyController.class)
@Import({RestTemplateConfig.class, CorsConfig.class})
@TestPropertySource(properties = {
        "gateway.users.url=http://users-mock:3000",
        "gateway.gamey.url=http://gamey-mock:4000"
})
@WithMockUser
class GameyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RestTemplate restTemplate;

    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        mockServer = MockRestServiceServer.createServer(restTemplate);
    }

    // --- GET /status ---

    @Test
    void status_returnsOkFromUpstream() throws Exception {
        mockServer.expect(requestTo("http://gamey-mock:4000/status"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("OK", MediaType.TEXT_PLAIN));

        mockMvc.perform(get("/status"))
                .andExpect(status().isOk())
                .andExpect(content().string("OK"));

        mockServer.verify();
    }

    @Test
    void status_propagatesUpstreamError() throws Exception {
        mockServer.expect(requestTo("http://gamey-mock:4000/status"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).body("Service Unavailable"));

        mockMvc.perform(get("/status"))
                .andExpect(status().isServiceUnavailable());

        mockServer.verify();
    }

    // --- POST /v1/ybot/choose/{botId} ---

    @Test
    void chooseBotMove_returnsCoordinatesFromUpstream() throws Exception {
        String responseBody = "{\"api_version\":\"v1\",\"bot_id\":\"random\",\"coords\":{\"x\":1,\"y\":2,\"z\":3}}";
        mockServer.expect(requestTo("http://gamey-mock:4000/v1/ybot/choose/random"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        mockMvc.perform(post("/v1/ybot/choose/random")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"size\":5,\"num_players\":2}"))
                .andExpect(status().isOk())
                .andExpect(content().string(responseBody));

        mockServer.verify();
    }

    @Test
    void chooseBotMove_propagatesBotNotFoundError() throws Exception {
        mockServer.expect(requestTo("http://gamey-mock:4000/v1/ybot/choose/unknown-bot"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).body("{\"error\":\"Bot not found\"}"));

        mockMvc.perform(post("/v1/ybot/choose/unknown-bot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"size\":5,\"num_players\":2}"))
                .andExpect(status().isNotFound());

        mockServer.verify();
    }

    @Test
    void chooseBotMove_propagatesUnsupportedVersionError() throws Exception {
        mockServer.expect(requestTo("http://gamey-mock:4000/v1/ybot/choose/random"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("{\"error\":\"Unsupported API version\"}"));

        mockMvc.perform(post("/v1/ybot/choose/random")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"size\":3,\"num_players\":2}"))
                .andExpect(status().isBadRequest());

        mockServer.verify();
    }

    // --- POST /v1/game/play ---

    @Test
    void playMove_returnsUpdatedGameStateFromUpstream() throws Exception {
        String responseBody = "{\"yen\":{},\"status\":\"Ongoing\",\"winner\":null}";
        mockServer.expect(requestTo("http://gamey-mock:4000/v1/game/play"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        mockMvc.perform(post("/v1/game/play")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"yen\":{},\"coords\":{\"x\":0,\"y\":0,\"z\":0},\"player_idx\":0}"))
                .andExpect(status().isOk())
                .andExpect(content().string(responseBody));

        mockServer.verify();
    }

    @Test
    void playMove_returnsFinishedStatusWhenGameEnds() throws Exception {
        String responseBody = "{\"yen\":{},\"status\":\"Finished\",\"winner\":0}";
        mockServer.expect(requestTo("http://gamey-mock:4000/v1/game/play"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        mockMvc.perform(post("/v1/game/play")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"yen\":{},\"coords\":{\"x\":2,\"y\":1,\"z\":3},\"player_idx\":0}"))
                .andExpect(status().isOk())
                .andExpect(content().string(responseBody));

        mockServer.verify();
    }

    @Test
    void playMove_propagatesIllegalMoveError() throws Exception {
        mockServer.expect(requestTo("http://gamey-mock:4000/v1/game/play"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("{\"error\":\"Illegal move\"}"));

        mockMvc.perform(post("/v1/game/play")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"yen\":{},\"coords\":{\"x\":99,\"y\":99,\"z\":99},\"player_idx\":0}"))
                .andExpect(status().isBadRequest());

        mockServer.verify();
    }

    @Test
    void playMove_propagatesInvalidYenFormatError() throws Exception {
        mockServer.expect(requestTo("http://gamey-mock:4000/v1/game/play"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("{\"error\":\"Invalid YEN format\"}"));

        mockMvc.perform(post("/v1/game/play")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"yen\":\"invalid\",\"coords\":{\"x\":0,\"y\":0,\"z\":0},\"player_idx\":0}"))
                .andExpect(status().isBadRequest());

        mockServer.verify();
    }
}