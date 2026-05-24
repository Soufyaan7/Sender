package com.example.sender.controller;

import com.example.sender.model.Campaign;
import com.example.sender.model.DeliveryLog;
import com.example.sender.repository.CampaignRepository;
import com.example.sender.repository.DeliveryLogRepository;
import com.example.sender.service.CampaignService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDateTime;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/campaigns")
public class CampaignController {

    private final CampaignRepository campaignRepository;
    private final CampaignService campaignService;
    private final DeliveryLogRepository deliveryLogRepository;

    public CampaignController(CampaignRepository campaignRepository,
                              CampaignService campaignService,
                              DeliveryLogRepository deliveryLogRepository) {
        this.campaignRepository = campaignRepository;
        this.campaignService = campaignService;
        this.deliveryLogRepository = deliveryLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<Campaign>> getAllCampaigns() {
        return ResponseEntity.ok(campaignRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Campaign> getCampaignById(@PathVariable Long id) {
        return campaignRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Campaign> createCampaign(@RequestBody Campaign campaign) {
        return ResponseEntity.ok(campaignService.createCampaign(campaign));
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<?> sendCampaign(@PathVariable Long id, @RequestBody SendRequest sendRequest) {
        if (sendRequest.getListIds() == null || sendRequest.getListIds().isEmpty()) {
            return ResponseEntity.badRequest().body("Must select at least one contact list to send.");
        }
        try {
            Campaign campaign = campaignService.sendCampaign(id, sendRequest.getListIds());
            return ResponseEntity.ok(campaign);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<Page<DeliveryLog>> getCampaignLogs(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("sentAt").descending());
        return ResponseEntity.ok(deliveryLogRepository.findByCampaignId(id, pageable));
    }

    @PostMapping("/{id}/stop")
    @Transactional
    public ResponseEntity<?> stopCampaign(@PathVariable Long id) {
        Optional<Campaign> campaignOpt = campaignRepository.findById(id);
        if (campaignOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Campaign campaign = campaignOpt.get();
        if (!"SENDING".equals(campaign.getStatus())) {
            return ResponseEntity.badRequest().body("La campagne n'est pas en cours d'envoi.");
        }
        
        campaign.setStatus("STOPPED");
        campaignRepository.save(campaign);

        List<DeliveryLog> pendingLogs = deliveryLogRepository.findByCampaignIdAndStatus(id, "PENDING");
        for (DeliveryLog log : pendingLogs) {
            log.setStatus("CANCELLED");
            log.setErrorMessage("Campagne stoppée par l'utilisateur");
            deliveryLogRepository.save(log);
        }

        return ResponseEntity.ok(campaign);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteCampaign(@PathVariable Long id) {
        Optional<Campaign> campaignOpt = campaignRepository.findById(id);
        if (campaignOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        deliveryLogRepository.deleteByCampaignId(id);
        campaignRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/{id}/duplicate")
    @Transactional
    public ResponseEntity<?> duplicateCampaign(@PathVariable Long id) {
        Optional<Campaign> campaignOpt = campaignRepository.findById(id);
        if (campaignOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Campaign original = campaignOpt.get();
        Campaign duplicate = new Campaign(original.getSubject() + " (Copie)", original.getHtmlContent());
        duplicate.setStatus("DRAFT");
        duplicate.setCreatedAt(LocalDateTime.now());
        Campaign saved = campaignRepository.save(duplicate);
        return ResponseEntity.ok(saved);
    }

    public static class SendRequest {
        private List<Long> listIds;

        public List<Long> getListIds() {
            return listIds;
        }

        public void setListIds(List<Long> listIds) {
            this.listIds = listIds;
        }
    }
}
