"use strict";

const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");
const contactSubmit = document.getElementById("contact-submit");
document.getElementById("year").textContent = new Date().getFullYear();

contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const message = {
        name: formData.get("name").trim(),
        email: formData.get("email").trim(),
        message: formData.get("message").trim()
    };

    contactSubmit.disabled = true;
    contactStatus.textContent = "Sending your message...";
    try {
        const response = await fetch("http://localhost:5000/api/contact-support", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to send your message.");
        contactForm.reset();
        contactStatus.textContent = data.message || "Your message was sent.";
    } catch (error) {
        contactStatus.textContent = error instanceof Error
            ? error.message
            : "Unable to connect to the server. Please try again.";
    } finally {
        contactSubmit.disabled = false;
    }
});
