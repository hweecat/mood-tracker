from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class EvalExample:
    """Normalized eval example shared by public fixtures and internal exports."""

    id: str
    dataset: str
    task: str
    input: dict[str, Any]
    reference: dict[str, Any]
    provenance: dict[str, Any]
    license: str
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

