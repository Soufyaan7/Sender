package com.example.sender.controller;

import com.example.sender.model.Contact;
import com.example.sender.model.EmailList;
import com.example.sender.repository.ContactRepository;
import com.example.sender.repository.EmailListRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Map;

@RestController
@RequestMapping("/api/lists")
public class EmailListController {

    private final EmailListRepository emailListRepository;
    private final ContactRepository contactRepository;

    public EmailListController(EmailListRepository emailListRepository, ContactRepository contactRepository) {
        this.emailListRepository = emailListRepository;
        this.contactRepository = contactRepository;
    }

    @GetMapping
    public ResponseEntity<List<EmailList>> getAllLists() {
        return ResponseEntity.ok(emailListRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmailList> getListById(@PathVariable Long id) {
        return emailListRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EmailList> createList(@RequestBody EmailList emailList) {
        return ResponseEntity.ok(emailListRepository.save(emailList));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmailList> updateList(@PathVariable Long id, @RequestBody EmailList updatedList) {
        return emailListRepository.findById(id)
                .map(list -> {
                    list.setName(updatedList.getName());
                    list.setDescription(updatedList.getDescription());
                    return ResponseEntity.ok(emailListRepository.save(list));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteList(@PathVariable Long id) {
        return emailListRepository.findById(id)
                .map(list -> {
                    // Remove links first to avoid foreign key errors in many-to-many join table
                    list.getContacts().clear();
                    emailListRepository.save(list);
                    emailListRepository.delete(list);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/contacts/{contactId}")
    public ResponseEntity<EmailList> addContactToList(@PathVariable Long id, @PathVariable Long contactId) {
        Optional<EmailList> listOpt = emailListRepository.findById(id);
        Optional<Contact> contactOpt = contactRepository.findById(contactId);

        if (listOpt.isPresent() && contactOpt.isPresent()) {
            EmailList list = listOpt.get();
            Contact contact = contactOpt.get();
            list.getContacts().add(contact);
            contact.getLists().add(list);
            contactRepository.save(contact);
            return ResponseEntity.ok(emailListRepository.save(list));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}/contacts/{contactId}")
    public ResponseEntity<EmailList> removeContactFromList(@PathVariable Long id, @PathVariable Long contactId) {
        Optional<EmailList> listOpt = emailListRepository.findById(id);
        Optional<Contact> contactOpt = contactRepository.findById(contactId);

        if (listOpt.isPresent() && contactOpt.isPresent()) {
            EmailList list = listOpt.get();
            Contact contact = contactOpt.get();
            list.getContacts().remove(contact);
            contact.getLists().remove(list);
            contactRepository.save(contact);
            return ResponseEntity.ok(emailListRepository.save(list));
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/contacts/bulk")
    public ResponseEntity<?> addContactsBulk(@PathVariable Long id, @RequestBody Map<String, List<String>> payload) {
        Optional<EmailList> listOpt = emailListRepository.findById(id);
        if (listOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        EmailList list = listOpt.get();
        List<String> emails = payload.get("emails");
        if (emails == null || emails.isEmpty()) {
            return ResponseEntity.badRequest().body("No emails provided");
        }

        int added = 0;
        for (String rawEmail : emails) {
            String email = rawEmail.trim();
            if (email.isEmpty() || !email.contains("@")) {
                continue;
            }
            Optional<Contact> contactOpt = contactRepository.findByEmail(email);
            Contact contact;
            if (contactOpt.isPresent()) {
                contact = contactOpt.get();
                if (!"ACTIVE".equals(contact.getStatus())) {
                    contact.setStatus("ACTIVE"); // Reactivate
                }
            } else {
                contact = new Contact(email, "", "", "ACTIVE");
            }
            contact.getLists().add(list);
            list.getContacts().add(contact);
            contactRepository.save(contact);
            added++;
        }
        emailListRepository.save(list);
        return ResponseEntity.ok(Map.of("success", true, "addedCount", added));
    }

    @PostMapping("/{id}/contacts/bulk-add-ids")
    public ResponseEntity<?> addContactsByIdsBulk(@PathVariable Long id, @RequestBody Map<String, List<Long>> payload) {
        Optional<EmailList> listOpt = emailListRepository.findById(id);
        if (listOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        EmailList list = listOpt.get();
        List<Long> contactIds = payload.get("contactIds");
        if (contactIds == null || contactIds.isEmpty()) {
            return ResponseEntity.badRequest().body("No contact IDs provided");
        }

        for (Long contactId : contactIds) {
            Optional<Contact> contactOpt = contactRepository.findById(contactId);
            if (contactOpt.isPresent()) {
                Contact contact = contactOpt.get();
                list.getContacts().add(contact);
                contact.getLists().add(list);
                contactRepository.save(contact);
            }
        }
        emailListRepository.save(list);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/{id}/contacts/bulk-remove-ids")
    public ResponseEntity<?> removeContactsByIdsBulk(@PathVariable Long id, @RequestBody Map<String, List<Long>> payload) {
        Optional<EmailList> listOpt = emailListRepository.findById(id);
        if (listOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        EmailList list = listOpt.get();
        List<Long> contactIds = payload.get("contactIds");
        if (contactIds == null || contactIds.isEmpty()) {
            return ResponseEntity.badRequest().body("No contact IDs provided");
        }

        for (Long contactId : contactIds) {
            Optional<Contact> contactOpt = contactRepository.findById(contactId);
            if (contactOpt.isPresent()) {
                Contact contact = contactOpt.get();
                list.getContacts().remove(contact);
                contact.getLists().remove(list);
                contactRepository.save(contact);
            }
        }
        emailListRepository.save(list);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
