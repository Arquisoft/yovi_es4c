package com.yovi.gateway.config;

import com.yovi.gateway.security.JwtFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SecurityConfig {

    @Bean
    public JwtFilter jwtFilter(@Value("${jwt.secret}") String jwtSecret) {
        return new JwtFilter(jwtSecret);
    }

    @Bean
    public FilterRegistrationBean<JwtFilter> jwtFilterRegistration(JwtFilter jwtFilter) {
        FilterRegistrationBean<JwtFilter> registration = new FilterRegistrationBean<>(jwtFilter);
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}