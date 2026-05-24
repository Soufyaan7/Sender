package com.example.sender.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String MAIL_QUEUE = "mail.queue";
    public static final String MAIL_EXCHANGE = "mail.exchange";
    public static final String MAIL_ROUTING_KEY = "mail.routing.key";

    @Bean
    public Queue mailQueue() {
        return QueueBuilder.durable(MAIL_QUEUE).build();
    }

    @Bean
    public TopicExchange mailExchange() {
        return new TopicExchange(MAIL_EXCHANGE);
    }

    @Bean
    public Binding mailBinding(Queue mailQueue, TopicExchange mailExchange) {
        return BindingBuilder.bind(mailQueue).to(mailExchange).with(MAIL_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
