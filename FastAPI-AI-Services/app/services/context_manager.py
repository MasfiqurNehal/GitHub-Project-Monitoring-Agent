"""
Conversation Context Manager.
Handles windowing, token budget truncation, system persona formatting, and context preparation.
Decoupled from AI Provider and Database layers.
"""
from typing import List, Dict, Any, Optional
from app.config import settings
from app.utils.logger import logger

class ContextManager:
    """Manages conversation context window, token budgets, and LLM prompt formatting."""

    def __init__(
        self,
        max_messages: Optional[int] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ):
        self.max_messages = max_messages or settings.MAX_CONTEXT_MESSAGES
        self.max_tokens = max_tokens or settings.MAX_CONTEXT_TOKENS
        self.system_prompt = system_prompt or settings.SYSTEM_PROMPT

    def estimate_tokens(self, text: str) -> int:
        """
        Estimate token count using standard ~4 characters per token heuristic.
        """
        if not text:
            return 0
        return max(1, len(text) // 4)

    def build_context(
        self,
        history_messages: List[Any],
        current_prompt: str,
        custom_system_prompt: Optional[str] = None,
        rag_context: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Build the list of message objects for the LLM API:
        1. Formats history messages into {"role": "user"|"assistant", "content": "..."}.
        2. Applies max_messages window limit.
        3. Enforces token budget (trims oldest messages if total token count exceeds max_tokens).
        4. Prepends the system persona instruction with optional RAG knowledge context.
        """
        sys_prompt = custom_system_prompt or self.system_prompt
        if rag_context:
            sys_prompt = f"{sys_prompt}\n\n{rag_context}"
        formatted_messages: List[Dict[str, str]] = []

        # Convert ORM models or dicts to standardized message dicts
        raw_list: List[Dict[str, str]] = []
        for msg in history_messages:
            if hasattr(msg, "sender") and hasattr(msg, "content"):
                role = "assistant" if msg.sender == "assistant" else "user"
                content = msg.content
            elif isinstance(msg, dict):
                role = "assistant" if msg.get("sender") == "assistant" else "user"
                content = msg.get("content", "")
            else:
                continue

            if content:
                raw_list.append({"role": role, "content": content})

        # Step 1: Apply max_messages windowing limit
        recent_window = raw_list[-self.max_messages:] if self.max_messages > 0 else raw_list

        # Step 2: Calculate token budget (including system prompt + current prompt)
        current_prompt_tokens = self.estimate_tokens(current_prompt)
        system_tokens = self.estimate_tokens(sys_prompt)
        available_history_tokens = self.max_tokens - (system_tokens + current_prompt_tokens)

        selected_history: List[Dict[str, str]] = []
        accumulated_tokens = 0

        # Traverse backwards from newest to oldest message
        for msg in reversed(recent_window):
            msg_tokens = self.estimate_tokens(msg["content"])
            if accumulated_tokens + msg_tokens <= available_history_tokens:
                selected_history.append(msg)
                accumulated_tokens += msg_tokens
            else:
                # Token budget reached
                logger.info(
                    f"[ContextManager] Truncated history message at token limit "
                    f"({accumulated_tokens + msg_tokens} > {available_history_tokens})"
                )
                break

        # Re-reverse selected history back into chronological order
        selected_history.reverse()

        # Step 3: Assemble final payload
        formatted_messages.append({"role": "system", "content": sys_prompt})
        formatted_messages.extend(selected_history)
        
        # Append current user prompt if not already present at tail
        if not selected_history or selected_history[-1]["content"] != current_prompt:
            formatted_messages.append({"role": "user", "content": current_prompt})

        total_context_tokens = system_tokens + accumulated_tokens + current_prompt_tokens
        logger.info(
            f"[ContextManager] Constructed LLM context: {len(formatted_messages)} total messages "
            f"({len(selected_history)} history items, est. {total_context_tokens} tokens)"
        )

        return formatted_messages

context_manager = ContextManager()
