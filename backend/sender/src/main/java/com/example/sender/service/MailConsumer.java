package com.example.sender.service;

import com.example.sender.config.RabbitMQConfig;
import com.example.sender.dto.MailMessageDto;
import com.example.sender.model.Campaign;
import com.example.sender.model.Contact;
import com.example.sender.model.DeliveryLog;
import com.example.sender.repository.CampaignRepository;
import com.example.sender.repository.DeliveryLogRepository;
import com.google.common.util.concurrent.RateLimiter;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class MailConsumer {

    private static final Logger log = LoggerFactory.getLogger(MailConsumer.class);

    // 30 emails per minute = 0.5 emails per second (1 permit every 2 seconds)
    private final RateLimiter rateLimiter = RateLimiter.create(0.5);

    private final DeliveryLogRepository deliveryLogRepository;
    private final CampaignRepository campaignRepository;
    private final MailSenderService mailSenderService;

    public MailConsumer(DeliveryLogRepository deliveryLogRepository,
                        CampaignRepository campaignRepository,
                        MailSenderService mailSenderService) {
        this.deliveryLogRepository = deliveryLogRepository;
        this.campaignRepository = campaignRepository;
        this.mailSenderService = mailSenderService;
    }

    @RabbitListener(queues = RabbitMQConfig.MAIL_QUEUE)
    @Transactional
    public void consumeMailMessage(MailMessageDto message) {
        // Enforce rate limiting of 30 emails per minute
        log.info("Received queue message for Delivery Log ID: {}. Acquiring rate limiter permit...", message.deliveryLogId());
        double waitTime = rateLimiter.acquire();
        if (waitTime > 0) {
            log.info("Rate limiter throttled message for {} seconds", String.format("%.2f", waitTime));
        }

        processMail(message.deliveryLogId());
    }

    @Transactional
    public void processMail(Long deliveryLogId) {
        Optional<DeliveryLog> logOpt = deliveryLogRepository.findById(deliveryLogId);
        if (logOpt.isEmpty()) {
            log.error("DeliveryLog not found with ID: {}", deliveryLogId);
            return;
        }

        DeliveryLog deliveryLog = logOpt.get();
        if (!"PENDING".equals(deliveryLog.getStatus())) {
            log.warn("DeliveryLog ID: {} already processed. Status is: {}", deliveryLogId, deliveryLog.getStatus());
            return;
        }

        Campaign campaign = deliveryLog.getCampaign();
        Contact contact = deliveryLog.getContact();

        if (campaign == null || contact == null) {
            log.error("Corrupted DeliveryLog details: campaign or contact is null for log ID: {}", deliveryLogId);
            deliveryLog.setStatus("FAILED");
            deliveryLog.setErrorMessage("Corrupted delivery log details");
            deliveryLogRepository.save(deliveryLog);
            return;
        }

        // Check if the campaign was stopped by user
        if ("STOPPED".equals(campaign.getStatus())) {
            log.info("Campaign ID: {} is STOPPED. Skipping delivery for log ID: {}", campaign.getId(), deliveryLogId);
            deliveryLog.setStatus("CANCELLED");
            deliveryLog.setErrorMessage("Campagne stoppée par l'utilisateur");
            deliveryLogRepository.save(deliveryLog);
            return;
        }

        // Check if recipient is ACTIVE. If not, skip sending
        if (!"ACTIVE".equalsIgnoreCase(contact.getStatus())) {
            log.info("Skipping inactive contact (status: {}): {}", contact.getStatus(), contact.getEmail());
            deliveryLog.setStatus("FAILED");
            deliveryLog.setErrorMessage("Contact status is " + contact.getStatus());
            deliveryLogRepository.save(deliveryLog);
            updateCampaignStats(campaign.getId(), false);
            return;
        }

        JavaMailSender mailSender = mailSenderService.getJavaMailSender();
        String fromEmail = mailSenderService.getFromEmail();

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            
            // Add deliverability and anti-spam headers
            mimeMessage.addHeader("List-Unsubscribe", "<http://localhost:8080/api/contacts/unsubscribe?email=" + contact.getEmail() + ">");
            mimeMessage.addHeader("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
            mimeMessage.addHeader("Precedence", "bulk");

            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            helper.setTo(contact.getEmail());
            helper.setSubject(campaign.getSubject());
            
            // Personalization variables (ex: {{firstName}}, {{lastName}}, {{email}})
            String htmlContent = campaign.getHtmlContent()
                    .replace("{{firstName}}", contact.getFirstName() != null ? contact.getFirstName() : "")
                    .replace("{{lastName}}", contact.getLastName() != null ? contact.getLastName() : "")
                    .replace("{{email}}", contact.getEmail());
            
            // Append one-click unsubscribe footer
            String unsubscribeUrl = "http://localhost:8080/api/contacts/unsubscribe?email=" + contact.getEmail();
            String footerHtml = "<hr style=\"border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0 10px 0;\"/>" +
                    "<p style=\"font-size: 11px; color: #9ca3af; text-align: center; font-family: sans-serif; line-height: 1.5;\">" +
                    "Cet e-mail vous a été envoyé via notre plateforme d'information. <br/>" +
                    "<a href=\"" + unsubscribeUrl + "\" style=\"color: #6366f1; text-decoration: underline;\">Se désabonner de cette liste</a>" +
                    "</p>";
            htmlContent += footerHtml;

            helper.setText(htmlContent, true);
            helper.setFrom(fromEmail);

            // Attempt transmission
            mailSender.send(mimeMessage);

            // Update Log
            deliveryLog.setStatus("SENT");
            deliveryLog.setSentAt(LocalDateTime.now());
            deliveryLogRepository.save(deliveryLog);

            // Update Campaign stats
            updateCampaignStats(campaign.getId(), true);
            log.info("Successfully sent campaign email to {}", contact.getEmail());

        } catch (Exception e) {
            log.error("Failed to send email to {} due to error: {}", contact.getEmail(), e.getMessage());

            // Update Log
            deliveryLog.setStatus("FAILED");
            deliveryLog.setErrorMessage(e.getMessage());
            deliveryLog.setSentAt(LocalDateTime.now());
            deliveryLogRepository.save(deliveryLog);

            // Update Campaign stats
            updateCampaignStats(campaign.getId(), false);
        }
    }

    private void updateCampaignStats(Long campaignId, boolean success) {
        Campaign campaign = campaignRepository.findById(campaignId).orElse(null);
        if (campaign == null) return;

        if ("STOPPED".equals(campaign.getStatus())) {
            log.info("Campaign ID: {} is STOPPED. Ignoring stats update.", campaignId);
            return;
        }

        if (success) {
            campaign.setSentCount(campaign.getSentCount() + 1);
        } else {
            campaign.setFailedCount(campaign.getFailedCount() + 1);
        }

        int processed = campaign.getSentCount() + campaign.getFailedCount();
        if (processed >= campaign.getTotalContacts()) {
            campaign.setStatus("SENT");
            campaign.setSentAt(LocalDateTime.now());
            log.info("Campaign ID: {} fully completed sending.", campaignId);
        }

        campaignRepository.save(campaign);
    }
}
