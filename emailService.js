class EmailService {
    constructor() {
        this.providers = [
            { name: "Provider1", send: this.mockSend.bind(this) },
            { name: "Provider2", send: this.mockSend.bind(this) }
        ];
        this.currentProvider = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // Initial delay in milliseconds
        this.rateLimit = 2; // Maximum 2 emails per minute
        this.emailCache = new Set();
        this.sentEmails = 0;
        this.startRateLimitWindow();
    }

    /**
     * Initializes the rate limiting window.
     * Resets the sent email count every minute.
     */
    startRateLimitWindow() {
        setInterval(() => {
            this.sentEmails = 0;
        }, 60000); // 1 minute
    }

    /**
     * Sends an email with retry, fallback, and idempotency handling.
     * @param {string} email - Recipient's email address
     * @param {string} subject - Subject of the email
     * @param {string} body - Body of the email
     */
    async sendEmail(email, subject, body) {
        const cacheKey = `${email}-${subject}-${body}`;
        
        // Check for duplicate email
        if (this.emailCache.has(cacheKey)) {
            this.updateStatus("Duplicate email detected. Not sending again.", true, 3000);
            this.log(`Duplicate email detected. Email to ${email} was not sent again.`);
            return;
        }

        this.emailCache.add(cacheKey);

        // Check rate limiting
        if (this.sentEmails >= this.rateLimit) {
            this.updateStatus("Rate limit exceeded. Try again later.", true, 3000);
            this.log(`Rate limit exceeded for email to ${email}.`);
            return;
        }

        this.sentEmails++;

        // Retry logic with fallback mechanism
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                await this.providers[this.currentProvider].send(email, subject, body);
                this.updateStatus(`Email sent successfully via ${this.providers[this.currentProvider].name}`, false, 2000);
                this.log(`Email sent successfully to ${email} via ${this.providers[this.currentProvider].name} on attempt ${attempt}.`);
                return;
            } catch (error) {
                this.updateStatus(`Attempt ${attempt} failed: ${error}. Retrying...`, true, 3000);
                this.log(`Attempt ${attempt} to send email to ${email} via ${this.providers[this.currentProvider].name} failed: ${error}.`);
                await this.sleep(this.retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
            }
        }

        // Switch provider and retry
        this.switchProvider();
        this.updateStatus("Switched provider. Retrying...", true, 3000);
        this.log(`Switched provider to ${this.providers[this.currentProvider].name} and retrying to send email to ${email}.`);
        return this.sendEmail(email, subject, body); // Retry with the new provider
    }

    /**
     * Switches to the next email provider in the list.
     */
    switchProvider() {
        this.currentProvider = (this.currentProvider + 1) % this.providers.length;
    }

    /**
     * Returns a promise that resolves after a given delay.
     * @param {number} ms - The delay in milliseconds
     * @returns {Promise} - A promise that resolves after the delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Simulates sending an email.
     * @param {string} email - Recipient's email address
     * @param {string} subject - Subject of the email
     * @param {string} body - Body of the email
     * @throws {Error} - Throws an error to simulate failure
     */
    async mockSend(email, subject, body) {
        if (Math.random() > 0.5) {
            throw new Error("Mock provider failure");
        }
        console.log(`Email sent to ${email} with subject: ${subject}`);
    }

    /**
     * Updates the status message on the web page.
     * @param {string} message - The status message to display
     * @param {boolean} isError - Indicates if the message is an error
     * @param {number} resetDelay - Delay before hiding the status message
     */
    updateStatus(message, isError = false, resetDelay = 7000) {
        const statusDiv = document.getElementById('status');
        statusDiv.style.display = 'block';
        statusDiv.innerText = message;

        // Apply styling based on error status
        if (isError) {
            statusDiv.style.backgroundColor = 'red';
            statusDiv.style.color = 'white';
        } else {
            statusDiv.style.backgroundColor = 'green';
            statusDiv.style.color = 'white';
        }

        // Reset the form and status message after the specified delay
        setTimeout(() => {
            document.getElementById('emailForm').reset();
            statusDiv.style.display = 'none';
        }, resetDelay);
    }

    /**
     * Logs messages to the status area.
     * @param {string} message - The log message
     */
    log(message) {
        const logMessage = `${new Date().toLocaleTimeString()}: ${message}`;
        const logDiv = document.createElement('div');
        logDiv.textContent = logMessage;
        const statusDiv = document.getElementById('status');
        statusDiv.appendChild(logDiv);
    }
}

// Event listener for form submission
document.getElementById('emailForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const body = document.getElementById('body').value;

    const emailService = new EmailService();
    await emailService.sendEmail(email, subject, body);
});
