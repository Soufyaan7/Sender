package com.example.sender.controller;

import com.example.sender.model.Campaign;
import com.example.sender.model.DeliveryLog;
import com.example.sender.repository.CampaignRepository;
import com.example.sender.repository.ContactRepository;
import com.example.sender.repository.DeliveryLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final ContactRepository contactRepository;
    private final CampaignRepository campaignRepository;
    private final DeliveryLogRepository deliveryLogRepository;

    public DashboardController(ContactRepository contactRepository,
                               CampaignRepository campaignRepository,
                               DeliveryLogRepository deliveryLogRepository) {
        this.contactRepository = contactRepository;
        this.campaignRepository = campaignRepository;
        this.deliveryLogRepository = deliveryLogRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        // Contacts count
        long totalContacts = contactRepository.count();
        long activeContacts = contactRepository.countByStatus("ACTIVE");
        long unsubscribedContacts = contactRepository.countByStatus("UNSUBSCRIBED");

        stats.put("totalContacts", totalContacts);
        stats.put("activeContacts", activeContacts);
        stats.put("unsubscribedContacts", unsubscribedContacts);

        // Campaigns count
        long totalCampaigns = campaignRepository.count();
        stats.put("totalCampaigns", totalCampaigns);

        // Delivery log status counts
        List<Object[]> logCounts = deliveryLogRepository.countAllStatuses();
        long sentCount = 0;
        long failedCount = 0;
        long pendingCount = 0;

        for (Object[] row : logCounts) {
            String status = (String) row[0];
            long count = (Long) row[1];
            if ("SENT".equalsIgnoreCase(status)) {
                sentCount = count;
            } else if ("FAILED".equalsIgnoreCase(status)) {
                failedCount = count;
            } else if ("PENDING".equalsIgnoreCase(status)) {
                pendingCount = count;
            }
        }

        stats.put("totalSent", sentCount);
        stats.put("totalFailed", failedCount);
        stats.put("totalPending", pendingCount);

        long totalDeliveries = sentCount + failedCount;
        double successRate = totalDeliveries > 0 ? ((double) sentCount / totalDeliveries) * 100 : 100.0;
        stats.put("successRate", Math.round(successRate * 10.0) / 10.0);

        // Recent logs mapped to details (email, subject, status, sentAt, error)
        List<DeliveryLog> rawLogs = deliveryLogRepository.findTop50ByOrderBySentAtDesc();
        List<Map<String, Object>> recentLogs = new ArrayList<>();
        for (DeliveryLog logItem : rawLogs) {
            Map<String, Object> logMap = new HashMap<>();
            logMap.put("id", logItem.getId());
            logMap.put("email", logItem.getContact() != null ? logItem.getContact().getEmail() : "Unknown");
            logMap.put("firstName", logItem.getContact() != null ? logItem.getContact().getFirstName() : "");
            logMap.put("lastName", logItem.getContact() != null ? logItem.getContact().getLastName() : "");
            logMap.put("campaignSubject", logItem.getCampaign() != null ? logItem.getCampaign().getSubject() : "Unknown Campaign");
            logMap.put("status", logItem.getStatus());
            logMap.put("sentAt", logItem.getSentAt());
            logMap.put("errorMessage", logItem.getErrorMessage());
            recentLogs.add(logMap);
        }
        stats.put("recentLogs", recentLogs);

        // Recent campaign overview
        List<Campaign> campaigns = campaignRepository.findAllByOrderByCreatedAtDesc();
        stats.put("campaigns", campaigns);

        return ResponseEntity.ok(stats);
    }
}
