package com.example.sender.controller;

import com.example.sender.model.Contact;
import com.example.sender.repository.ContactRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/bounces")
public class BounceController {

    private static final Logger log = LoggerFactory.getLogger(BounceController.class);
    
    private final ContactRepository contactRepository;

    public BounceController(ContactRepository contactRepository) {
        this.contactRepository = contactRepository;
    }

    /**
     * Webhook endpoint to receive hard bounces from SMTP providers (Mailgun, SendGrid, Brevo, etc.)
     * Payload structure expected:
     * {
     *   "email": "user@example.com",
     *   "event": "bounce",
     *   "reason": "550 User unknown"
     * }
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handleBounceWebhook(@RequestBody BouncePayload payload) {
        String email = payload.getEmail();
        log.info("Bounce webhook received for email: {} | Event: {} | Reason: {}", 
                email, payload.getEvent(), payload.getReason());

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Email field is mandatory"));
        }

        Optional<Contact> contactOpt = contactRepository.findByEmail(email);
        if (contactOpt.isPresent()) {
            Contact contact = contactOpt.get();
            contact.setStatus("BOUNCED");
            contactRepository.save(contact);
            log.info("Contact with email {} flagged as BOUNCED due to hard bounce notification.", email);
            return ResponseEntity.ok(Map.of("success", true, "message", "Contact status updated to BOUNCED."));
        } else {
            log.warn("Bounce received for email {}, but no matching contact exists in database.", email);
            return ResponseEntity.ok(Map.of("success", true, "message", "Bounce ignored, contact not found."));
        }
    }

    public static class BouncePayload {
        private String email;
        private String event;
        private String reason;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getEvent() {
            return event;
        }

        public void setEvent(String event) {
            this.event = event;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }
}
