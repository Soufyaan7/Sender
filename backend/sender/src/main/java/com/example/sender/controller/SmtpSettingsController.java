package com.example.sender.controller;

import com.example.sender.model.SmtpSettings;
import com.example.sender.repository.SmtpSettingsRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.Properties;

@RestController
@RequestMapping("/api/settings/smtp")
public class SmtpSettingsController {

    private static final Logger log = LoggerFactory.getLogger(SmtpSettingsController.class);

    private final SmtpSettingsRepository smtpSettingsRepository;

    public SmtpSettingsController(SmtpSettingsRepository smtpSettingsRepository) {
        this.smtpSettingsRepository = smtpSettingsRepository;
    }

    @GetMapping
    public ResponseEntity<SmtpSettings> getSmtpSettings() {
        return ResponseEntity.ok(
                smtpSettingsRepository.findFirstByOrderByIdAsc()
                        .orElse(new SmtpSettings("", 587, "", "", "", true, true))
        );
    }

    @PostMapping
    public ResponseEntity<SmtpSettings> saveSmtpSettings(@RequestBody SmtpSettings settings) {
        Optional<SmtpSettings> existingOpt = smtpSettingsRepository.findFirstByOrderByIdAsc();
        if (existingOpt.isPresent()) {
            SmtpSettings existing = existingOpt.get();
            existing.setHost(settings.getHost());
            existing.setPort(settings.getPort());
            existing.setUsername(settings.getUsername());
            existing.setPassword(settings.getPassword());
            existing.setFromEmail(settings.getFromEmail());
            existing.setAuth(settings.isAuth());
            existing.setStarttls(settings.isStarttls());
            return ResponseEntity.ok(smtpSettingsRepository.save(existing));
        } else {
            return ResponseEntity.ok(smtpSettingsRepository.save(settings));
        }
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> testSmtpSettings(@RequestBody TestRequest testRequest) {
        SmtpSettings settings = testRequest.getSettings();
        String toEmail = testRequest.getToEmail();

        if (settings == null || toEmail == null || toEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid inputs."));
        }

        log.info("Testing SMTP settings for host: {} to recipient: {}", settings.getHost(), toEmail);

        try {
            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost(settings.getHost());
            mailSender.setPort(settings.getPort());
            mailSender.setUsername(settings.getUsername());
            mailSender.setPassword(settings.getPassword());

            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", String.valueOf(settings.isAuth()));
            props.put("mail.smtp.starttls.enable", String.valueOf(settings.isStarttls()));
            
            // Short timeouts for test
            props.put("mail.smtp.connectiontimeout", "4000");
            props.put("mail.smtp.timeout", "4000");
            props.put("mail.smtp.writetimeout", "4000");

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "utf-8");
            
            helper.setTo(toEmail);
            helper.setSubject("Mass Email Platform - SMTP Test Connection");
            helper.setText("<div style='font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;'>" +
                    "<h2 style='color: #4f46e5;'>Connection Verified!</h2>" +
                    "<p>Your SMTP server configurations have been successfully tested.</p>" +
                    "<hr style='border-top: 1px solid #eee; margin: 20px 0;'>" +
                    "<p style='font-size: 12px; color: #666;'>Sent automatically by your Mass Email platform.</p>" +
                    "</div>", true);
            helper.setFrom(settings.getFromEmail());

            mailSender.send(message);
            return ResponseEntity.ok(Map.of("success", true));

        } catch (Exception e) {
            log.error("SMTP Test failed", e);
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    public static class TestRequest {
        private SmtpSettings settings;
        private String toEmail;

        public SmtpSettings getSettings() {
            return settings;
        }

        public void setSettings(SmtpSettings settings) {
            this.settings = settings;
        }

        public String getToEmail() {
            return toEmail;
        }

        public void setToEmail(String toEmail) {
            this.toEmail = toEmail;
        }
    }
}
