package com.yovi.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Filtro JWT que protege todas las rutas excepto las públicas.
 *
 * Rutas públicas (sin token):
 *   POST /auth/login
 *   POST /auth/register
 *   GET  /auth/health
 *   GET  /actuator/health
 *   GET  /status
 *
 * El resto de rutas requieren el header:
 *   Authorization: Bearer <token>
 *
 * Si el token es válido, el filtro añade el header X-User-Id al request
 * para que los servicios downstream puedan identificar al usuario.
 */
@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final List<String> PUBLIC_PREFIXES = List.of(
        "/auth/",
        "/actuator/",
        "/status"
    );

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendUnauthorized(response, "Missing or invalid Authorization header");
            return;
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
                .build()
                .parseSignedClaims(token)
                .getPayload();

            // Propagamos el userId a los servicios downstream via atributo de request.
            // Los controllers pueden leerlo con request.getAttribute("userId").
            request.setAttribute("jwtUserId", claims.get("userId"));
            request.setAttribute("jwtUsername", claims.get("username"));

            chain.doFilter(request, response);

        } catch (JwtException e) {
            sendUnauthorized(response, "Invalid or expired token");
        }
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}