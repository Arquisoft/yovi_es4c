package yovi;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;
import java.time.Duration;

public class LoginSimulation extends Simulation {

    HttpProtocolBuilder httpProtocol = http
        .baseUrl("https://localhost")
        .disableCaching()
        .acceptHeader("application/json")
        .contentTypeHeader("application/json");

    FeederBuilder<String> csvFeeder = csv("users.csv").random();

    ScenarioBuilder loginScenario = scenario("Login usuarios yovi")
        .feed(csvFeeder)
        .exec(
            http("POST /login")
                .post("/login")
                .body(StringBody(
                    "{ \"username\": \"#{username}\", \"password\": \"#{password}\" }"
                )).asJson()
                .check(status().is(200))
                .check(jsonPath("$.userId").exists())
        )
        .pause(1, 2)
        .exec(
            http("GET /api/leaderboard")
                .get("/api/leaderboard?limit=10&offset=0")
                .check(status().in(200, 401))
        )
        .pause(1)
        .exec(
            http("GET /api/games")
                .get("/api/games")
                .check(status().in(200, 401))
        )
        .pause(1);

    {
        setUp(
            loginScenario.injectOpen(
                atOnceUsers(5),
                nothingFor(Duration.ofSeconds(5)),
                rampUsers(20).during(Duration.ofSeconds(30)),
                nothingFor(Duration.ofSeconds(5)),
                constantUsersPerSec(2).during(Duration.ofSeconds(60))
            ).protocols(httpProtocol)
        ).assertions(
            global().responseTime().percentile(95.0).lt(3000),
            global().successfulRequests().percent().gt(90.0)
        );
    }
}