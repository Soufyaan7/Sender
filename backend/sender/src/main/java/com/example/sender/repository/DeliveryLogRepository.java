package com.example.sender.repository;

import com.example.sender.model.DeliveryLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeliveryLogRepository extends JpaRepository<DeliveryLog, Long> {

    Page<DeliveryLog> findByCampaignId(Long campaignId, Pageable pageable);

    List<DeliveryLog> findByCampaignIdAndStatus(Long campaignId, String status);

    void deleteByCampaignId(Long campaignId);

    List<DeliveryLog> findTop50ByOrderBySentAtDesc();

    @Query("SELECT dl.status, COUNT(dl) FROM DeliveryLog dl WHERE dl.campaign.id = :campaignId GROUP BY dl.status")
    List<Object[]> countStatusByCampaignId(@Param("campaignId") Long campaignId);

    @Query("SELECT dl.status, COUNT(dl) FROM DeliveryLog dl GROUP BY dl.status")
    List<Object[]> countAllStatuses();
}
