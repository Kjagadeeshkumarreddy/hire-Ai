import os
from typing import Dict, Any, List, Optional
from pathlib import Path
import structlog

logger = structlog.get_logger()

TEMPLATES_DIR = Path(__file__).parent / "templates"

# Registry of all built-in resume templates with metadata
TEMPLATE_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "modern_minimal",
        "name": "Modern Minimal",
        "description": "Clean layout with generous whitespace, horizontal rules, and a focus on readability. Perfect for tech and startup roles.",
        "category": "Modern",
        "icon": "✨",
        "color": "#6366f1",  # Indigo
        "preview_sections": ["Summary", "Experience", "Skills", "Projects"],
    },
    {
        "id": "corporate_professional",
        "name": "Corporate Professional",
        "description": "Traditional structure with bold section borders, formal tone, and detailed role descriptions. Ideal for enterprise and management positions.",
        "category": "Corporate",
        "icon": "🏢",
        "color": "#0ea5e9",  # Sky blue
        "preview_sections": ["Professional Summary", "Professional Experience", "Education", "Certifications"],
    },
    {
        "id": "creative_designer",
        "name": "Creative Designer",
        "description": "Bold, personality-forward layout with emoji accents and arrow-style bullets. Great for design, marketing, and creative roles.",
        "category": "Creative",
        "icon": "🎨",
        "color": "#ec4899",  # Pink
        "preview_sections": ["Who I Am", "Impact", "Toolkit", "Recognition"],
    },
    {
        "id": "tech_engineering",
        "name": "Tech & Engineering",
        "description": "Skills-first layout with monospace accents, tech tables, and project showcases. Built for software engineers and data scientists.",
        "category": "Technical",
        "icon": "⚙️",
        "color": "#10b981",  # Emerald
        "preview_sections": ["Technical Skills", "Experience", "Projects", "Publications"],
    },
    {
        "id": "academic_research",
        "name": "Academic & Research",
        "description": "Scholarly format with publications list, grants, and teaching sections. Designed for researchers, professors, and PhD candidates.",
        "category": "Academic",
        "icon": "🎓",
        "color": "#8b5cf6",  # Violet
        "preview_sections": ["Research Interests", "Publications", "Grants", "Teaching"],
    },
    {
        "id": "executive_leadership",
        "name": "Executive Leadership",
        "description": "Achievement-driven layout with metrics tables, board roles, and thought leadership. Tailored for C-suite and VP-level professionals.",
        "category": "Executive",
        "icon": "👔",
        "color": "#f59e0b",  # Amber
        "preview_sections": ["Executive Profile", "Leadership Experience", "Key Achievements", "Board Roles"],
    },
]


def get_all_templates() -> List[Dict[str, Any]]:
    """Returns metadata for all available resume templates."""
    return TEMPLATE_CATALOG


def get_template_text(template_id: str) -> Optional[str]:
    """Loads and returns the raw markdown text for a given template ID."""
    template_path = TEMPLATES_DIR / f"{template_id}.md"
    
    if not template_path.exists():
        logger.error("template_registry.not_found", template_id=template_id, path=str(template_path))
        return None
    
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error("template_registry.read_failed", template_id=template_id, error=str(e))
        return None


def get_template_by_id(template_id: str) -> Optional[Dict[str, Any]]:
    """Returns the metadata for a specific template by ID."""
    for template in TEMPLATE_CATALOG:
        if template["id"] == template_id:
            return template
    return None
