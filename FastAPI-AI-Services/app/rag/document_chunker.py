"""
Document Chunker Module for GitMonitor RAG Pipeline.
Splits Markdown and text documents into structured, searchable context chunks with metadata.
"""
import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class DocumentChunk:
    chunk_id: str
    doc_name: str
    title: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    char_count: int = 0
    token_estimate: int = 0

    def __post_init__(self):
        self.char_count = len(self.content)
        self.token_estimate = max(1, self.char_count // 4)

class DocumentChunker:
    """Handles splitting Markdown and plain text documents into chunks."""

    def __init__(self, target_chunk_size: int = 500, chunk_overlap: int = 50):
        self.target_chunk_size = target_chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_markdown(self, content: str, doc_name: str) -> List[DocumentChunk]:
        """
        Split markdown documentation content by section headers (#, ##, ###)
        and further divide large sections if necessary.
        """
        chunks: List[DocumentChunk] = []
        if not content or not content.strip():
            return chunks

        # Split document by headers while preserving section titles
        sections = re.split(r"\n(?=#{1,3}\s)", content)
        chunk_index = 0

        for sec in sections:
            sec_text = sec.strip()
            if not sec_text:
                continue

            # Extract header title if present
            first_line = sec_text.split("\n")[0]
            header_match = re.match(r"^#{1,3}\s+(.+)$", first_line)
            if header_match:
                section_title = header_match.group(1).strip()
            else:
                section_title = doc_name.replace("_", " ").title()

            # If section content is reasonable, keep as single chunk
            if len(sec_text) <= self.target_chunk_size * 1.5:
                chunk_index += 1
                chunks.append(DocumentChunk(
                    chunk_id=f"{doc_name}-chunk-{chunk_index}",
                    doc_name=doc_name,
                    title=section_title,
                    content=sec_text,
                    metadata={"header": section_title, "doc": doc_name}
                ))
            else:
                # Split large section into sliding window sub-chunks
                sub_chunks = self._sliding_window_split(sec_text, self.target_chunk_size, self.chunk_overlap)
                for sub_idx, sub_text in enumerate(sub_chunks, 1):
                    chunk_index += 1
                    chunks.append(DocumentChunk(
                        chunk_id=f"{doc_name}-chunk-{chunk_index}",
                        doc_name=doc_name,
                        title=f"{section_title} (Part {sub_idx})",
                        content=sub_text,
                        metadata={"header": section_title, "doc": doc_name, "part": sub_idx}
                    ))

        return chunks

    def _sliding_window_split(self, text: str, chunk_size: int, overlap: int) -> List[str]:
        """Split text using sliding window of characters with boundary snapping to sentences/paragraphs."""
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = ""

        for paragraph in paragraphs:
            if len(current_chunk) + len(paragraph) + 2 <= chunk_size:
                current_chunk += ("\n\n" if current_chunk else "") + paragraph
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = paragraph

        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks

document_chunker = DocumentChunker()
