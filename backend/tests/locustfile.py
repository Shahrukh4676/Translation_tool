from locust import HttpUser, task, between

class TransliterationUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def test_transliterate_text(self):
        """Simulate direct text transliteration load."""
        self.client.post("/api/transliterate/text", json={
            "text": "ನಮಸ್ಕಾರ! ಎಲ್ಲರಿಗೂ ಸುಸ್ವಾಗತ. ಇದು ಕನ್ನಡ ಮತ್ತು ದೇವನಾಗರಿ ಲಿಪಿ ಪರಿವರ್ತಕ."
        })

    @task(1)
    def test_get_overrides(self):
        """Simulate override dictionary fetch."""
        self.client.get("/api/overrides/")

    @task(1)
    def test_health(self):
        """Simulate health check ping."""
        self.client.get("/api/health")
