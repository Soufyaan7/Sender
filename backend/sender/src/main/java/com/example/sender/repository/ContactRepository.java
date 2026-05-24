package com.example.sender.repository;

import com.example.sender.model.Contact;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;

@Repository
public interface ContactRepository extends JpaRepository<Contact, Long> {

    Optional<Contact> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByStatus(String status);

    @Query("SELECT c FROM Contact c JOIN c.lists l WHERE l.id = :listId AND c.status = 'ACTIVE'")
    Set<Contact> findActiveContactsByListId(@Param("listId") Long listId);

    Page<Contact> findByEmailContainingIgnoreCaseOrFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String email, String firstName, String lastName, Pageable pageable);
}
