package com.example.sender.repository;

import com.example.sender.model.SmtpSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SmtpSettingsRepository extends JpaRepository<SmtpSettings, Long> {
    Optional<SmtpSettings> findFirstByOrderByIdAsc();
}
