package com.example.sender.repository;

import com.example.sender.model.EmailList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmailListRepository extends JpaRepository<EmailList, Long> {
}
