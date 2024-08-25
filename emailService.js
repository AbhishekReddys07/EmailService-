document.getElementById('emailForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const body = document.getElementById('body').value;

    const emailService = new EmailService([new Provider1(), new Provider2()]);
    await emailService.sendEmail(email, subject, body);
});

// Abstract Provider Class
class EmailProvider {
    async send(email, subject, body) {
        throw new Error("Method 'send()' must be implemented.");
    }
}

// Concrete Providers
class Provider1 extends EmailProvider {
    async send(email, subject, body) {
        if (Math.random() > 0.5) {
            throw new Error("Provider1 failure");
        }
        console.log(`Email sent by Provider1 to ${email}`);
    }
}

class Provider2 extends EmailProvider {
    async send(email, subject, body) {
        if (Math.random() > 0.5) {
            throw new Error("Provider2 failure");
        }
        console.log(`Email sent by Provider2 to ${email}`);
    }
}

// EmailService Class
class EmailService {
    constructor(providers) {
        this.providers = providers;
        this.currentProviderIndex = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // Initial delay in milliseconds
        this.rateLimit = 2; // Max 2 emails per minute
        this.emailCache = new Set(); // Cache for idempotency
        this.sentEmails = 0; // Counter for rate limiting
        this.startRateLimitWindow();
    }

    startRateLimitWindow() {
        setInterval(() => {
            this.sentEmails = 0;
        }, 60000); // Reset every 1 minute
    }

    async sendEmail(email, subject, body) {
        const cacheKey = this.generateCacheKey(email, subject, body);

        // Idempotency check: Skip sending if the email has already been sent
        if (this.emailCache.has(cacheKey)) {
            this.updateStatus("Duplicate email detected. Not sending again.", true, 3000);
            this.log(`Duplicate email detected: ${cacheKey}`);
            return;
        }

        // Add the cache key to the set
        this.emailCache.add(cacheKey);

        // Rate Limiting check
        if (this.sentEmails >= this.rateLimit) {
            this.updateStatus("Rate limit exceeded. Try again later.", true, 3000);
            this.log("Rate limit exceeded.");
            return;
        }

        this.sentEmails++;

        // Retry Mechanism with Exponential Backoff
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                await this.providers[this.currentProviderIndex].send(email, subject, body);
                this.updateStatus(`Email sent successfully via ${this.providers[this.currentProviderIndex].constructor.name}`, false, 2000);
                this.log(`Email sent successfully to ${email} on attempt ${attempt}`);
                return;
            } catch (error) {
                this.updateStatus(`Attempt ${attempt} failed: ${error}. Retrying...`, true, 3000);
                this.log(`Attempt ${attempt} failed: ${error}`);
                await this.sleep(this.retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
            }
        }

        // Fallback Mechanism: Switch to the next provider
        this.switchProvider();
        this.updateStatus("Switched provider. Retrying...", true, 3000);
        this.log("Switched provider.");
        return this.sendEmail(email, subject, body); // Retry with the new provider
    }

    generateCacheKey(email, subject, body) {
        // Create a unique key for each email
        return `${email}:${subject}:${body}`;
    }

    switchProvider() {
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    updateStatus(message, isError = false, displayDuration = 3000) {
        const statusDiv = document.getElementById('status');
        statusDiv.style.display = 'block';
        statusDiv.innerText = message;

        // Change background color based on error status
        statusDiv.style.backgroundColor = isError ? 'red' : 'green';
        statusDiv.style.color = 'white';

        // Reset the status message after the specified duration
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, displayDuration);
    }

    log(message) {
        const logMessage = `${new Date().toLocaleTimeString()}: ${message}`;
        const logDiv = document.createElement('div');
        logDiv.textContent = logMessage;
        const statusDiv = document.getElementById('status');
        statusDiv.appendChild(logDiv);
    }
}


