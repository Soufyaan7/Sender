package com.example.sender.service;

import com.example.sender.model.SmtpSettings;
import com.example.sender.repository.SmtpSettingsRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Properties;

@Service
public class MailSenderService {

    private static final Logger log = LoggerFactory.getLogger(MailSenderService.class);
    private final SmtpSettingsRepository smtpSettingsRepository;

    public MailSenderService(SmtpSettingsRepository smtpSettingsRepository) {
        this.smtpSettingsRepository = smtpSettingsRepository;
    }

    /**
     * Get the dynamic JavaMailSender instance based on saved settings in the database.
     * If no configurations exist, a mock/dummy mail sender is returned which logs the delivery.
     */
    public JavaMailSender getJavaMailSender() {
        Optional<SmtpSettings> settingsOpt = smtpSettingsRepository.findFirstByOrderByIdAsc();

        if (settingsOpt.isEmpty()) {
            log.warn("No SMTP Settings found in database. Falling back to Log-Only Mock Mail Sender.");
            return createMockMailSender();
        }

        SmtpSettings settings = settingsOpt.get();
        if (settings.getHost() == null || settings.getHost().isBlank()) {
            log.warn("SMTP Host is not configured. Falling back to Log-Only Mock Mail Sender.");
            return createMockMailSender();
        }

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(settings.getHost());
        mailSender.setPort(settings.getPort());
        mailSender.setUsername(settings.getUsername());
        mailSender.setPassword(settings.getPassword());

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(settings.isAuth()));
        props.put("mail.smtp.starttls.enable", String.valueOf(settings.isStarttls()));
        props.put("mail.debug", "false");
        
        // Timeout settings
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");

        return mailSender;
    }

    public String getFromEmail() {
        return smtpSettingsRepository.findFirstByOrderByIdAsc()
                .map(SmtpSettings::getFromEmail)
                .orElse("noreply@mockmail.local");
    }

    private JavaMailSender createMockMailSender() {
        return new JavaMailSenderImpl() {
            @Override
            public void send(MimeMessage mimeMessage) {
                try {
                    String subject = mimeMessage.getSubject();
                    String content = mimeMessage.getContent().toString();
                    String recipients = mimeMessage.getAllRecipients() != null ? 
                        java.util.Arrays.toString(mimeMessage.getAllRecipients()) : "Unknown";
                    log.info("[MOCK SMTP SENDER] Dispatching mail to: {} | Subject: {} | Content Length: {}", 
                            recipients, subject, content.length());
                } catch (Exception e) {
                    log.error("Failed to read MimeMessage in Mock Sender", e);
                }
            }
        };
    }
}
