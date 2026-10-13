import httpx
from typing import Dict, Any, Optional
from datetime import datetime

class WhatsAppService:
    @staticmethod
    async def send_message(
        phone_number_id: str,
        access_token: str,
        to_phone: str,
        body: str
    ) -> Dict[str, Any]:
        """
        Sends a WhatsApp message using the Official Meta WhatsApp Business Cloud API.
        """
        if not phone_number_id or not access_token:
            raise ValueError("WhatsApp Business Cloud API credentials not configured.")

        # Clean phone number (strip spaces, dashes, ensure no leading + for graph api or format cleanly)
        cleaned_phone = "".join(filter(str.isdigit, to_phone))
        if not cleaned_phone:
            raise ValueError(f"Invalid WhatsApp phone number: {to_phone}")

        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": cleaned_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": body
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code >= 400:
                error_detail = response.text
                try:
                    err_json = response.json()
                    error_detail = err_json.get("error", {}).get("message", response.text)
                except Exception:
                    pass
                raise RuntimeError(f"WhatsApp API Error ({response.status_code}): {error_detail}")

            data = response.json()
            return {
                "status": "success",
                "message_id": data.get("messages", [{}])[0].get("id", "wa_success"),
                "raw_response": data
            }

    @staticmethod
    def send_simulation(to_phone: str, body: str) -> Dict[str, Any]:
        cleaned = "".join(filter(str.isdigit, to_phone))
        if len(cleaned) < 8:
            raise ValueError(f"Invalid phone number length for WhatsApp: {to_phone}")
        return {
            "status": "success",
            "message_id": f"wa_sim_{int(datetime.utcnow().timestamp())}",
            "mode": "simulation"
        }
