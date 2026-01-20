"""
Base agent class using AWS Bedrock Nova Pro.
"""

import json
import logging
import re
from typing import Any, Optional
from abc import ABC, abstractmethod

import boto3
from botocore.exceptions import ClientError

from ..config import settings

logger = logging.getLogger(__name__)


class BedrockAgent(ABC):
    """
    Base class for all P2P agents using AWS Bedrock Nova Pro.

    Provides common functionality for:
    - LLM invocation with retry logic
    - Conversation history management
    - JSON response parsing
    - WebSocket event emission
    """

    def __init__(
        self,
        agent_name: str,
        role: str,
        region: str = None,
        model_id: str = None,
        use_mock: bool = False,
    ):
        self.agent_name = agent_name
        self.role = role
        self.region = region or settings.aws_region
        self.model_id = model_id or settings.bedrock_model_id
        self.conversation_history: list[dict[str, str]] = []
        self._websocket_callback: Optional[callable] = None
        self.use_mock = use_mock

        # Initialize Bedrock client (unless in mock mode)
        if not use_mock:
            self.bedrock = boto3.client(
                "bedrock-runtime",
                region_name=self.region,
            )
        else:
            self.bedrock = None

    @property
    def name(self) -> str:
        """Return agent name in snake_case format."""
        # Convert CamelCase to snake_case
        import re
        name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', self.agent_name)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()

    def set_websocket_callback(self, callback: callable) -> None:
        """Set callback for WebSocket event emission."""
        self._websocket_callback = callback

    async def emit_event(self, event_type: str, data: dict[str, Any]) -> None:
        """Emit event via WebSocket if callback is set."""
        if self._websocket_callback:
            await self._websocket_callback({
                "agent": self.agent_name,
                "event": event_type,
                "data": data,
            })

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the system prompt for this agent. Must be implemented by subclasses."""
        pass

    @abstractmethod
    def get_responsibilities(self) -> list[str]:
        """Return list of agent responsibilities. Must be implemented by subclasses."""
        pass

    def invoke(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
        temperature: float = 0.1,
        max_tokens: int = 2048,
        timeout: int = 45,
        max_retries: int = 2,
    ) -> dict[str, Any]:
        """
        Invoke the LLM with the given prompt and context.

        Args:
            prompt: User prompt or task description
            context: Optional context data (will be JSON serialized)
            temperature: LLM temperature (0.0-1.0, lower = more deterministic)
            max_tokens: Maximum tokens in response
            timeout: Timeout in seconds for API call (default 45s)
            max_retries: Maximum number of retries on failure (default 2)

        Returns:
            Parsed response dictionary with 'status', 'response', and agent-specific fields
        """
        # Handle mock mode
        if self.use_mock:
            return self._mock_invoke(prompt, context)

        # Build the full prompt with context
        full_prompt = self._build_prompt(prompt, context)

        # Add to conversation history
        self.conversation_history.append({"role": "user", "content": full_prompt})

        last_error = None
        for attempt in range(max_retries + 1):
            try:
                # Prepare request body for Nova Pro
                request_body = {
                    "messages": [
                        {"role": "user", "content": [{"text": full_prompt}]}
                    ],
                    "system": [{"text": self.get_system_prompt()}],
                    "inferenceConfig": {
                        "temperature": temperature,
                        "maxTokens": max_tokens,
                    },
                }

                # Invoke Bedrock with timeout
                import signal
                
                def timeout_handler(signum, frame):
                    raise TimeoutError(f"Bedrock API call exceeded {timeout}s timeout")
                
                # Set up timeout alarm (Unix/Linux only - Windows will skip this)
                try:
                    signal.signal(signal.SIGALRM, timeout_handler)
                    signal.alarm(timeout)
                except (AttributeError, ValueError):
                    # Windows doesn't support SIGALRM, continue without timeout
                    pass
                
                try:
                    response = self.bedrock.invoke_model(
                        modelId=self.model_id,
                        body=json.dumps(request_body),
                        contentType="application/json",
                        accept="application/json",
                    )
                finally:
                    try:
                        signal.alarm(0)  # Cancel alarm
                    except (AttributeError, ValueError):
                        pass

                # Parse response
                response_body = json.loads(response["body"].read())
                assistant_message = response_body["output"]["message"]["content"][0]["text"]

                # Add to history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": assistant_message,
                })

                # Parse JSON from response
                result = self._parse_json_response(assistant_message)
                result["raw_response"] = assistant_message

                logger.info(f"{self.agent_name} completed task successfully")
                return result

            except (ClientError, TimeoutError) as e:
                last_error = e
                error_msg = str(e)
                if attempt < max_retries:
                    logger.warning(
                        f"{self.agent_name} attempt {attempt + 1}/{max_retries + 1} failed: {error_msg}. Retrying..."
                    )
                    import time
                    time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s
                    continue
                else:
                    logger.error(f"{self.agent_name}: {error_msg} (all retries exhausted)")
                    break
            except Exception as e:
                last_error = e
                logger.error(f"{self.agent_name} unexpected error: {str(e)}")
                break
        
        # All retries failed
        return {
            "status": "error",
            "error": f"Failed after {max_retries + 1} attempts: {str(last_error)}",
            "raw_response": None,
        }

    def _mock_invoke(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Return mock response for testing.

        Args:
            prompt: User prompt
            context: Optional context

        Returns:
            Mock response dict
        """
        self.conversation_history.append({"role": "user", "content": prompt})

        # Generate context-aware mock response
        mock_response = self._generate_mock_response(prompt, context)

        self.conversation_history.append({
            "role": "assistant",
            "content": json.dumps(mock_response),
        })

        logger.info(f"{self.agent_name} (mock) completed task")
        return mock_response

    def _generate_mock_response(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Generate appropriate mock response based on agent type and prompt."""
        # Base mock response - subclasses can override
        return {
            "status": "success",
            "response": "mock_response",
            "decision": "approved",
            "reasoning": f"Mock response from {self.agent_name}",
            "confidence": 0.95,
        }

    def _build_prompt(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
    ) -> str:
        """Build the full prompt with context."""
        parts = []

        # Add context if provided
        if context:
            parts.append("CONTEXT:")
            parts.append(json.dumps(context, indent=2, default=str))
            parts.append("")

        # Add the main prompt
        parts.append("TASK:")
        parts.append(prompt)

# Add response format instruction with strategic storytelling style
        parts.append("")
        parts.append("RESPONSE FORMAT:")
        parts.append("Return a JSON object with this exact structure:")
        parts.append('{')  
        parts.append('  "status": "valid|invalid|approved|rejected|pending|...",')  
        parts.append('  "verdict": "AUTO_APPROVE|HITL_FLAG",')  
        parts.append('  "verdict_reason": "Clear single-sentence explanation",')  
        parts.append('  "reasoning_bullets": [')  
        parts.append('    "✓ First key validation that passed",')  
        parts.append('    "✗ Critical issue found that requires attention",')  
        parts.append('    "! Warning - potential concern",')  
        parts.append('    "... (6-10 validation items total)"')  
        parts.append('  ],')  
        parts.append('  ... (other agent-specific fields)')  
        parts.append('}')  
        parts.append("")
        parts.append("CRITICAL VALIDATION RULES:")
        parts.append("1. ONLY check items that can ACTUALLY be validated from the provided data")
        parts.append("2. DO NOT invent issues. DO NOT flag missing data as problematic if it's normal.")
        parts.append("3. DO NOT say 'supplier pending' if supplier exists in the data")
        parts.append("4. DO NOT say 'significant amount' for amounts under $50,000 unless truly exceptional")
        parts.append("5. DO NOT flag quantity mismatches unless ACTUAL discrepancy exists in data")
        parts.append("6. Flag for HITL ONLY if there is a GENUINE business risk that needs human judgment")
        parts.append("")
        parts.append("REASONING BULLET REQUIREMENTS:")
        parts.append("1. Create EXACTLY 6-10 concise validation points")
        parts.append("2. Start each bullet with ONE symbol:")
        parts.append("   ✓ - Validation PASSED (item is compliant/correct)")
        parts.append("   ✗ - Validation FAILED (critical issue found)")
        parts.append("   ! - Warning (caution needed, not blocking)")
        parts.append("3. Each bullet = ONE validation item with result. NO descriptive facts.")
        parts.append("4. Format: [Symbol] [What was checked]: [Result/finding]")
        parts.append("5. Examples:")
        parts.append("   ✓ Supplier verification: ABC Corp verified in approved vendor list")
        parts.append("   ✗ Budget check: $75K exceeds department limit of $50K by 50%")
        parts.append("   ! Delivery timeline: 2-week lead time risks project deadline")
        parts.append("6. For HITL_FLAG: Put ✗ (blocking issues) FIRST")
        parts.append("7. Keep each bullet under 120 characters")
        parts.append("")
        parts.append("VERDICT LOGIC:")
        parts.append("- AUTO_APPROVE: All critical validations passed (some ! warnings OK)")
        parts.append("- HITL_FLAG: One or more ✗ critical failures found that need human review")
        parts.append("- verdict_reason: ONE sentence summarizing the decision driver")

        return "\n".join(parts)

    def _parse_json_response(self, response: str) -> dict[str, Any]:
        """
        Parse JSON from LLM response, handling markdown code blocks.

        Args:
            response: Raw LLM response string

        Returns:
            Parsed JSON dictionary, or error dict if parsing fails
        """
        # Try to extract JSON from markdown code blocks
        json_patterns = [
            r"```json\s*([\s\S]*?)\s*```",
            r"```\s*([\s\S]*?)\s*```",
            r"\{[\s\S]*\}",
        ]

        for pattern in json_patterns:
            match = re.search(pattern, response)
            if match:
                try:
                    json_str = match.group(1) if "```" in pattern else match.group(0)
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    continue

        # If no valid JSON found, return structured response
        return {
            "status": "success",
            "response": response,
            "parsed": False,
        }

    def clear_history(self) -> None:
        """Clear conversation history."""
        self.conversation_history = []

    def get_history(self) -> list[dict[str, str]]:
        """Return conversation history."""
        return self.conversation_history.copy()


class MockBedrockAgent:
    """
    Mock agent for testing without AWS credentials.
    Returns predefined responses based on agent type.
    """

    def __init__(
        self,
        name: str = "mock_agent",
        agent_name: str = None,
        role: str = "Mock Agent",
        mock_responses: dict = None,
        websocket_callback: callable = None,
    ):
        self._name = name
        self.agent_name = agent_name or name
        self.role = role
        self.conversation_history = []
        self._websocket_callback = websocket_callback
        self.mock_responses = mock_responses or {}
        self.bedrock = None  # No actual client

    @property
    def name(self) -> str:
        """Return agent name (snake_case)."""
        return self._name

    async def invoke(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """Return mock response for testing."""
        self.conversation_history.append({"role": "user", "content": prompt})

        # Get mock response or default
        response = self.mock_responses.get(
            self.agent_name,
            {
                "status": "success",
                "response": "mock_response",
                "decision": "approved",
                "reasoning": "Mock approval for testing",
            },
        )

        self.conversation_history.append({
            "role": "assistant",
            "content": json.dumps(response),
        })

        # Call websocket callback if set
        if self._websocket_callback:
            await self._websocket_callback({
                "agent": self.agent_name,
                "event": "response",
                "data": response,
            })

        return response

    def get_system_prompt(self) -> str:
        return f"Mock system prompt for {self.agent_name}"

    def get_responsibilities(self) -> list[str]:
        return [f"Mock responsibility for {self.agent_name}"]
