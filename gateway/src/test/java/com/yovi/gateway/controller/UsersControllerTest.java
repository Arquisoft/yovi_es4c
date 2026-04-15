package com.yovi.gateway.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
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
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;

@WebMvcTest(
    value = UsersController.class,
    excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        SecurityFilterAutoConfiguration.class
    }
)
@Import({RestTemplateConfig.class, CorsConfig.class})
@TestPropertySource(properties = {
        "gateway.users.url=http://users-mock:3000",
        "gateway.gamey.url=http://gamey-mock:4000"
})
class UsersControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RestTemplate restTemplate;

    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        mockServer = MockRestServiceServer.createServer(restTemplate);
    }


    // --- GET /api/games ---

    @Test
    void getGames_returnsGamesListFromUpstream() throws Exception {
        String responseBody = "[{\"id\":1,\"yen\":\"...\",\"players\":[]}]";
        mockServer.expect(requestTo("http://users-mock:3000/api/games"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        mockMvc.perform(get("/api/games"))
                .andExpect(status().isOk())
                .andExpect(content().string(responseBody));

        mockServer.verify();
    }

    @Test
    void getGames_propagatesUpstreamServerError() throws Exception {
        mockServer.expect(requestTo("http://users-mock:3000/api/games"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"db error\"}"));

        mockMvc.perform(get("/api/games"))
                .andExpect(status().isInternalServerError());

        mockServer.verify();
    }

    // --- POST /api/games ---

    @Test
    void saveGame_returnsCreatedFromUpstream() throws Exception {
        mockServer.expect(requestTo("http://users-mock:3000/api/games"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.CREATED).body("{\"gameId\":42}"));

        mockMvc.perform(post("/api/games")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"yen\":\"...\",\"players\":[]}"))
                .andExpect(status().isCreated());

        mockServer.verify();
    }

    @Test
    void saveGame_propagatesBadRequestFromUpstream() throws Exception {
        mockServer.expect(requestTo("http://users-mock:3000/api/games"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("{\"error\":\"yen required\"}"));

        mockMvc.perform(post("/api/games")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockServer.verify();
    }

    // --- POST /api/games/seed ---

    @Test
    void seedGames_returnsCreatedFromUpstream() throws Exception {
        mockServer.expect(requestTo("http://users-mock:3000/api/games/seed"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.CREATED).body("{\"gamesCreated\":5}"));

        mockMvc.perform(post("/api/games/seed"))
                .andExpect(status().isCreated());

        mockServer.verify();
    }

    @Test
    void seedGames_propagatesErrorFromUpstream() throws Exception {
        mockServer.expect(requestTo("http://users-mock:3000/api/games/seed"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"seed failed\"}"));

        mockMvc.perform(post("/api/games/seed"))
                .andExpect(status().isInternalServerError());

        mockServer.verify();
    }

    // --- GET /api/users/{userId}/stats ---

        @Test
        void getUserStats_returnsStatsFromUpstream() throws Exception {
        String responseBody = "{\"totalGames\":10,\"wins\":7,\"losses\":3,\"winRate\":70," +
                "\"currentStreak\":3,\"topDay\":\"lunes\",\"topDayCount\":4," +
                "\"lastGame\":\"2026-03-29T21:06:00.000Z\",\"beatenBots\":7," +
                "\"memberSince\":\"2026-01-15T10:00:00.000Z\"}";

        mockServer.expect(requestTo("http://users-mock:3000/api/users/1/stats"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        mockMvc.perform(get("/api/users/1/stats"))
                .andExpect(status().isOk())
                .andExpect(content().string(responseBody));

        mockServer.verify();
        }

        @Test
        void getUserStats_propagatesUpstreamError() throws Exception {
        mockServer.expect(requestTo("http://users-mock:3000/api/users/99/stats"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"db error\"}"));

        mockMvc.perform(get("/api/users/99/stats"))
                .andExpect(status().isInternalServerError());

        mockServer.verify();
        }
     // --- GET /api/leaderboard ---
 
    @Test
    void getLeaderboard_returnsLeaderboardFromUpstream() throws Exception {
        String responseBody = "{\"data\":[{\"rank\":1,\"userId\":1,\"username\":\"Ana\",\"gamesPlayed\":20,\"wins\":15,\"winRate\":75.0}],\"pagination\":{\"total\":1,\"limit\":20,\"offset\":0}}";
 
        mockServer.expect(requestTo("http://users-mock:3000/api/leaderboard?limit=20&offset=0"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));
 
        mockMvc.perform(get("/api/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(content().string(responseBody));
 
        mockServer.verify();
    }
 
    @Test
    void getLeaderboard_forwardsLimitAndOffsetToUpstream() throws Exception {
        String responseBody = "{\"data\":[],\"pagination\":{\"total\":42,\"limit\":5,\"offset\":10}}";
 
        mockServer.expect(requestTo("http://users-mock:3000/api/leaderboard?limit=5&offset=10"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));
 
        mockMvc.perform(get("/api/leaderboard")
                        .param("limit", "5")
                        .param("offset", "10"))
                .andExpect(status().isOk())
                .andExpect(content().string(responseBody));
 
        mockServer.verify();
    }
 
    @Test
    void getLeaderboard_propagatesUpstreamServerError() throws Exception {
        mockServer.expect(requestTo("http://users-mock:3000/api/leaderboard?limit=20&offset=0"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("{\"error\":\"DB connection lost\"}"));
 
        mockMvc.perform(get("/api/leaderboard"))
                .andExpect(status().isInternalServerError());
 
        mockServer.verify();
    }
}