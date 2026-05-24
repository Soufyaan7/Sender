package com.example.sender.model;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "contacts")
public class Contact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(nullable = false)
    private String status = "ACTIVE"; // e.g., ACTIVE, UNSUBSCRIBED

    @ManyToMany(mappedBy = "contacts")
    @JsonIgnoreProperties("contacts")
    private Set<EmailList> lists = new HashSet<>();

    public Contact() {}

    public Contact(String email, String firstName, String lastName, String status) {
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Set<EmailList> getLists() {
        return lists;
    }

    public void setLists(Set<EmailList> lists) {
        this.lists = lists;
    }
}
