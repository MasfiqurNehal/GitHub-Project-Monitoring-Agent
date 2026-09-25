"""
Embedding Provider Abstraction Layer for GitMonitor RAG Pipeline.
Keeps embedding logic decoupled from AI completion providers and vector storage.
"""
import math
import re
import hashlib
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import httpx

from app.utils.logger import logger
from app.config import settings

class BaseEmbeddingProvider(ABC):
    """Abstract Base Class for vector embedding providers."""

    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Generate a dense numerical vector embedding for a single text string."""
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate numerical vector embeddings for a list of text strings."""
        pass

class TFIDFEmbeddingProvider(BaseEmbeddingProvider):
    """
    Lightweight, production-friendly vector space embedding provider.
    Uses TF-IDF + n-gram feature hashing to map text to normalized float vectors.
    Does not require external API calls or heavy binary C++ dependencies.
    """

    def __init__(self, vector_dim: int = 256):
        self.vector_dim = vector_dim

    STOP_WORDS = {
        "what", "is", "are", "the", "a", "an", "and", "or", "in", "on", "at", "to", "for",
        "of", "with", "by", "how", "do", "does", "can", "tell", "me", "about", "explain",
        "check", "write", "function", "array", "code"
    }

    def _tokenize(self, text: str) -> List[str]:
        """Extract lower-cased word tokens excluding stop words, plus bi-grams."""
        raw_words = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())
        meaningful_words = [w for w in raw_words if w not in self.STOP_WORDS]
        if not meaningful_words:
            meaningful_words = raw_words
        bigrams = [f"{meaningful_words[i]}_{meaningful_words[i+1]}" for i in range(len(meaningful_words)-1)]
        return meaningful_words + bigrams

    def _hash_token(self, token: str) -> int:
        """Hash token into feature dimension index."""
        md5 = hashlib.md5(token.encode("utf-8")).hexdigest()
        return int(md5, 16) % self.vector_dim

    def embed_text(self, text: str) -> List[float]:
        """Convert text into normalized TF-IDF feature hash vector."""
        if not text or not text.strip():
            return [0.0] * self.vector_dim

        tokens = self._tokenize(text)
        if not tokens:
            return [0.0] * self.vector_dim

        vec = [0.0] * self.vector_dim
        token_counts: Dict[int, int] = {}
        for token in tokens:
            idx = self._hash_token(token)
            token_counts[idx] = token_counts.get(idx, 0) + 1

        total_tokens = len(tokens)
        for idx, count in token_counts.items():
            tf = count / total_tokens
            vec[idx] = tf

        # Apply L2 normalization
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]

        return vec

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Batch embed texts."""
        return [self.embed_text(t) for t in texts]

class APIEmbeddingProvider(BaseEmbeddingProvider):
    """
    HTTP API Embedding Provider compatible with OpenAI / Betopia `/v1/embeddings` endpoint.
    Falls back gracefully to TFIDFEmbeddingProvider if network fails.
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None, model: str = "text-embedding-3-small"):
        self.base_url = (base_url or settings.AI_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.AI_API_KEY
        self.model = model
        self.fallback = TFIDFEmbeddingProvider()

    def embed_text(self, text: str) -> List[float]:
        if not self.api_key:
            return self.fallback.embed_text(text)

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    f"{self.base_url}/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={"input": text, "model": self.model}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["data"][0]["embedding"]
        except Exception as err:
            logger.warning(f"[EmbeddingProvider] API call failed, using TFIDF fallback: {err}")

        return self.fallback.embed_text(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_text(t) for t in texts]

class MockEmbeddingProvider(BaseEmbeddingProvider):
    """Deterministic mock embedding provider for testing."""

    def __init__(self, vector_dim: int = 64):
        self.vector_dim = vector_dim

    def embed_text(self, text: str) -> List[float]:
        val = float(len(text) % 10) / 10.0
        return [val] * self.vector_dim

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_text(t) for t in texts]

def get_embedding_provider(provider_type: Optional[str] = None) -> BaseEmbeddingProvider:
    """Factory function to instantiate configured embedding provider."""
    ptype = (provider_type or settings.EMBEDDING_PROVIDER).lower()
    if ptype == "api":
        return APIEmbeddingProvider()
    elif ptype == "mock":
        return MockEmbeddingProvider()
    else:
        return TFIDFEmbeddingProvider()
