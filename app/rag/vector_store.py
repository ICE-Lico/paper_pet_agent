import faiss
import numpy as np


class SimpleVectorStore:
    def __init__(self, dim: int):
        self.index = faiss.IndexFlatIP(dim)
        self.text_chunks = []

    def add(self, embeddings, chunks: list[str]):
        embeddings = np.array(embeddings, dtype="float32")
        self.index.add(embeddings)
        self.text_chunks.extend(chunks)

    def search(self, query_embedding, top_k: int = 3) -> list[str]:
        query_embedding = np.array([query_embedding], dtype="float32")
        scores, indices = self.index.search(query_embedding, top_k)

        results = []
        for idx in indices[0]:
            if 0 <= idx < len(self.text_chunks):
                results.append(self.text_chunks[idx])

        return results