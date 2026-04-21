package yovi;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;
import java.time.Duration;

public class GatewaySimulation extends Simulation {

    HttpProtocolBuilder httpProtocol = http
        .baseUrl("https://localhost:443")
        .disableCaching()
        .acceptHeader("application/json")
        .contentTypeHeader("application/json");

    FeederBuilder<String> csvFeeder = csv("users.csv").random();

    ScenarioBuilder scn = scenario("Carga API Gateway yovi")
        .feed(csvFeeder)
        .exec(
            http("POST /login")
                .post("/login")
                .body(StringBody(
                    "{ \"username\": \"#{username}\", \"password\": \"#{password}\" }"
                )).asJson()
                .check(status().is(200))
                .check(jsonPath("$.userId").saveAs("userId"))
        )
        .pause(1)
        .exec(
            http("GET /actuator/health")
                .get("/actuator/health")
                .check(status().is(200))
        )
        .pause(1)
        .exec(
            http("GET /api/leaderboard")
                .get("/api/leaderboard?limit=20&offset=0")
                .check(status().in(200, 401))
        )
        .pause(1)
        .exec(
            http("GET /api/users/stats")
                .get("/api/users/#{userId}/stats")
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
            scn.injectOpen(
                rampUsersPerSec(1).to(20).during(Duration.ofSeconds(60)),
                constantUsersPerSec(20).during(Duration.ofSeconds(60))
            ).protocols(httpProtocol)
        ).assertions(
            global().responseTime().mean().lt(2000),
            global().successfulRequests().percent().gt(95.0)
        );
    }
}