"use strict";

const feedbackForm = document.getElementById("feedback-form");
const feedbackStatus = document.getElementById("feedback-status");
const feedbackLoadStatus = document.getElementById("feedback-load-status");
const feedbackSubmit = document.getElementById("feedback-submit");
const feedbackList = document.getElementById("feedback-list");

document.getElementById("year").textContent = new Date().getFullYear();

function renderFeedback(entries) {
    feedbackList.replaceChildren();

    if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "text-gray-600";
        empty.textContent = "No feedback yet. Be the first to share your experience.";
        feedbackList.append(empty);
        return;
    }

    entries.forEach((entry) => {
        const article = document.createElement("article");
        article.className = "border-t py-4 first:border-t-0";

        const author = document.createElement("strong");
        author.className = "text-gray-900";
        author.textContent = entry.name;

        const date = document.createElement("p");
        date.className = "mt-1 text-xs text-gray-500";
        date.textContent = new Date(entry.createdAt).toLocaleString();

        const comment = document.createElement("p");
        comment.className = "mt-2 whitespace-pre-wrap text-gray-700";
        comment.textContent = entry.message;

        article.append(author, date, comment);
        feedbackList.append(article);
    });
}

async function loadFeedback() {
    feedbackLoadStatus.textContent = "Loading feedback...";

    try {
        const response = await fetch("/api/feedback");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load feedback.");
        }

        renderFeedback(data.feedback);
        feedbackLoadStatus.textContent = "";

    } catch (error) {
        feedbackLoadStatus.textContent = error instanceof Error
            ? error.message
            : "Unable to connect to the server. Please try again.";
    }
}

feedbackForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(feedbackForm);

    feedbackSubmit.disabled = true;
    feedbackStatus.textContent = "Saving your feedback...";

    try {
        const response = await fetch("/api/feedback", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: formData.get("name").trim(),
                email: formData.get("email").trim(),
                message: formData.get("message").trim()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to save feedback.");
        }

        feedbackForm.reset();
        await loadFeedback();

        feedbackStatus.textContent =
            data.message || "Your feedback has been saved.";

    } catch (error) {
        feedbackStatus.textContent = error instanceof Error
            ? error.message
            : "Unable to connect to the server. Please try again.";

    } finally {
        feedbackSubmit.disabled = false;
    }
});

loadFeedback();
