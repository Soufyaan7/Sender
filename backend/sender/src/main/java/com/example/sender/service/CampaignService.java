package com.example.sender.service;

import com.example.sender.config.RabbitMQConfig;
import com.example.sender.dto.MailMessageDto;
import com.example.sender.model.Campaign;
import com.example.sender.model.Contact;
import com.example.sender.model.DeliveryLog;
import com.example.sender.repository.CampaignRepository;
import com.example.sender.repository.ContactRepository;
import com.example.sender.repository.DeliveryLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class CampaignService {

    private static final Logger log = LoggerFactory.getLogger(CampaignService.class);

    private final CampaignRepository campaignRepository;
    private final ContactRepository contactRepository;
    private final DeliveryLogRepository deliveryLogRepository;
    private final RabbitTemplate rabbitTemplate;

    public CampaignService(CampaignRepository campaignRepository,
                           ContactRepository contactRepository,
                           DeliveryLogRepository deliveryLogRepository,
                           RabbitTemplate rabbitTemplate) {
        this.campaignRepository = campaignRepository;
        this.contactRepository = contactRepository;
        this.deliveryLogRepository = deliveryLogRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public Campaign createCampaign(Campaign campaign) {
        campaign.setStatus("DRAFT");
        campaign.setCreatedAt(LocalDateTime.now());
        return campaignRepository.save(campaign);
    }

    @Transactional
    public Campaign sendCampaign(Long campaignId, List<Long> listIds) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with ID: " + campaignId));

        if ("SENDING".equals(campaign.getStatus())) {
            throw new IllegalStateException("Campaign is already sending.");
        }

        // 1. Gather all active contacts from the selected lists uniquely
        Set<Contact> uniqueContacts = new HashSet<>();
        for (Long listId : listIds) {
            uniqueContacts.addAll(contactRepository.findActiveContactsByListId(listId));
        }

        int totalContacts = uniqueContacts.size();
        log.info("Starting campaign ID: {} | Subject: {} | Targets: {}", campaignId, campaign.getSubject(), totalContacts);

        campaign.setStatus(totalContacts > 0 ? "SENDING" : "SENT");
        campaign.setTotalContacts(totalContacts);
        campaign.setSentCount(0);
        campaign.setFailedCount(0);
        campaign.setSentAt(totalContacts > 0 ? null : LocalDateTime.now());
        campaign = campaignRepository.save(campaign);

        if (totalContacts == 0) {
            log.warn("No active contacts found for list selection: {}. Campaign completed immediately.", listIds);
            return campaign;
        }

        // 2. Provision delivery logs and enqueue messages
        for (Contact contact : uniqueContacts) {
            DeliveryLog deliveryLog = new DeliveryLog(campaign, contact);
            deliveryLog.setStatus("PENDING");
            deliveryLog = deliveryLogRepository.save(deliveryLog);

            MailMessageDto messagePayload = new MailMessageDto(deliveryLog.getId());
            
            // Publish message
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.MAIL_EXCHANGE,
                    RabbitMQConfig.MAIL_ROUTING_KEY,
                    messagePayload
            );
        }

        return campaign;
    }
}
