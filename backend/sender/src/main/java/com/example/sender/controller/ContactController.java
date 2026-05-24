package com.example.sender.controller;

import com.example.sender.model.Contact;
import com.example.sender.model.EmailList;
import com.example.sender.repository.ContactRepository;
import com.example.sender.repository.EmailListRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    private static final Logger log = LoggerFactory.getLogger(ContactController.class);

    private final ContactRepository contactRepository;
    private final EmailListRepository emailListRepository;

    public ContactController(ContactRepository contactRepository, EmailListRepository emailListRepository) {
        this.contactRepository = contactRepository;
        this.emailListRepository = emailListRepository;
    }

    @GetMapping
    public ResponseEntity<Page<Contact>> getAllContacts(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Contact> contactsPage;
        if (search == null || search.isBlank()) {
            contactsPage = contactRepository.findAll(pageable);
        } else {
            contactsPage = contactRepository.findByEmailContainingIgnoreCaseOrFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
                    search, search, search, pageable);
        }
        return ResponseEntity.ok(contactsPage);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Contact> getContactById(@PathVariable Long id) {
        return contactRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Contact> createContact(@RequestBody Contact contact) {
        if (contactRepository.existsByEmail(contact.getEmail())) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(contactRepository.save(contact));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Contact> updateContact(@PathVariable Long id, @RequestBody Contact updatedContact) {
        return contactRepository.findById(id)
                .map(contact -> {
                    contact.setEmail(updatedContact.getEmail());
                    contact.setFirstName(updatedContact.getFirstName());
                    contact.setLastName(updatedContact.getLastName());
                    contact.setStatus(updatedContact.getStatus());
                    return ResponseEntity.ok(contactRepository.save(contact));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContact(@PathVariable Long id) {
        if (contactRepository.existsById(id)) {
            contactRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importContacts(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "listId", required = false) Long listId) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Empty file"));
        }

        EmailList emailList = null;
        if (listId != null) {
            emailList = emailListRepository.findById(listId).orElse(null);
            if (emailList == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "List not found"));
            }
        }

        int created = 0;
        int updated = 0;
        int failed = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean isFirstLine = true;

            while ((line = reader.readLine()) != null) {
                String trimmedLine = line.trim();
                if (trimmedLine.isEmpty()) continue;

                // Handle header check on the first line
                if (isFirstLine) {
                    isFirstLine = false;
                    String normalizedHeader = trimmedLine.replace("\"", "").trim().toLowerCase();
                    // If first line is exactly one of these headers, skip it
                    if (normalizedHeader.equals("email") || normalizedHeader.equals("emails") || 
                        normalizedHeader.equals("e-mail") || normalizedHeader.equals("mail") ||
                        normalizedHeader.startsWith("email,")) {
                        continue;
                    }
                }

                // Get email: either the first column or the whole line
                String email;
                if (trimmedLine.contains(",")) {
                    String[] parts = trimmedLine.split(",(?=([^\"]*\"[^\"]*\")*[^\"]*$)");
                    email = parts[0].trim().replace("\"", "");
                } else {
                    email = trimmedLine.replace("\"", "");
                }

                if (email.isBlank() || !email.contains("@")) {
                    failed++;
                    continue;
                }

                Optional<Contact> existingOpt = contactRepository.findByEmail(email);
                Contact contact;
                if (existingOpt.isPresent()) {
                    contact = existingOpt.get();
                    contact.setStatus("ACTIVE"); // Reactivate on re-import
                    updated++;
                } else {
                    contact = new Contact(email, "", "", "ACTIVE");
                    created++;
                }

                // If importing into a list
                if (emailList != null) {
                    contact.getLists().add(emailList);
                    emailList.getContacts().add(contact);
                }

                contactRepository.save(contact);
            }

            if (emailList != null) {
                emailListRepository.save(emailList);
            }

            return ResponseEntity.ok(Map.of(
                    "created", created,
                    "updated", updated,
                    "failed", failed,
                    "total", created + updated + failed
            ));

        } catch (Exception e) {
            log.error("CSV import error: ", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/unsubscribe")
    public ResponseEntity<String> unsubscribeUser(@RequestParam("email") String email) {
        log.info("Unsubscribe request received via GET for email: {}", email);
        Optional<Contact> contactOpt = contactRepository.findByEmail(email);
        if (contactOpt.isPresent()) {
            Contact contact = contactOpt.get();
            contact.setStatus("UNSUBSCRIBED");
            contactRepository.save(contact);
        }
        
        String html = String.format(
            "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +
            "  <meta charset='UTF-8'>" +
            "  <title>Désabonnement Réussi</title>" +
            "  <style>" +
            "    body { font-family: system-ui, -apple-system, sans-serif; background: #0b0f19; color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }" +
            "    .card { background: rgba(22, 28, 45, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); padding: 2.5rem; border-radius: 16px; text-align: center; max-width: 450px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); backdrop-filter: blur(12px); }" +
            "    h1 { color: #6366f1; font-size: 1.6rem; margin-bottom: 1rem; font-weight: 700; }" +
            "    p { color: #9ca3af; font-size: 0.95rem; line-height: 1.6; margin: 0 0 1.5rem 0; }" +
            "    .email-display { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 0.5rem 1rem; border-radius: 8px; color: white; font-family: monospace; display: inline-block; font-size: 0.9rem; }" +
            "  </style>" +
            "</head>" +
            "<body>" +
            "  <div class='card'>" +
            "    <h1>Désabonnement pris en compte</h1>" +
            "    <p>Votre adresse e-mail a bien été retirée de nos listes de diffusion. Vous ne recevrez plus aucun e-mail automatique ou commercial de notre part.</p>" +
            "    <div class='email-display'>%s</div>" +
            "  </div>" +
            "</body>" +
            "</html>",
            email
        );

        return ResponseEntity.ok()
                .header("Content-Type", "text/html; charset=UTF-8")
                .body(html);
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<Map<String, Object>> unsubscribePost(@RequestParam("email") String email) {
        log.info("Unsubscribe request received via POST (One-Click) for email: {}", email);
        Optional<Contact> contactOpt = contactRepository.findByEmail(email);
        if (contactOpt.isPresent()) {
            Contact contact = contactOpt.get();
            contact.setStatus("UNSUBSCRIBED");
            contactRepository.save(contact);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/bulk-delete")
    @Transactional
    public ResponseEntity<?> bulkDeleteContacts(@RequestBody Map<String, List<Long>> payload) {
        List<Long> contactIds = payload.get("contactIds");
        if (contactIds == null || contactIds.isEmpty()) {
            return ResponseEntity.badRequest().body("No contact IDs provided");
        }
        for (Long id : contactIds) {
            if (contactRepository.existsById(id)) {
                Optional<Contact> contactOpt = contactRepository.findById(id);
                if (contactOpt.isPresent()) {
                    Contact contact = contactOpt.get();
                    for (EmailList list : contact.getLists()) {
                        list.getContacts().remove(contact);
                    }
                    contact.getLists().clear();
                    contactRepository.delete(contact);
                }
            }
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
}
