package yovi;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;
import java.time.Duration;

public class GetSimulation extends Simulation {

    HttpProtocolBuilder httpProtocol = http
        .baseUrl("https://localhost:443")
        .disableCaching()
        .acceptHeader("text/html,application/xhtml+xml,*/*;q=0.8")
        .acceptLanguageHeader("es-ES,es;q=0.9");

    ScenarioBuilder scn = scenario("Navegación páginas públicas yovi")
        .exec(http("GET /").get("/").check(status().is(200)))
        .pause(1)
        .exec(http("GET /login").get("/login").check(status().is(200)))
        .pause(1)
        .exec(http("GET /register").get("/register").check(status().is(200)))
        .pause(1);

    {
        setUp(
            scn.injectOpen(
                nothingFor(Duration.ofSeconds(2)),
                rampUsersPerSec(1).to(10).during(Duration.ofSeconds(30)),
                constantUsersPerSec(10).during(Duration.ofSeconds(30))
            ).protocols(httpProtocol)
        ).assertions(
            global().responseTime().max().lt(5000),
            global().successfulRequests().percent().gt(95.0)
        );
    }
}