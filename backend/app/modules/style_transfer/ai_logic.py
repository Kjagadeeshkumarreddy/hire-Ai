import json
import structlog
from typing import Dict, Any, List
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import settings

logger = structlog.get_logger()

# Initialize Groq client
groq_llm = ChatGroq(
    groq_api_key=settings.GROQ_API_KEY, 
    model_name="openai/gpt-oss-120b",
    temperature=0.1
)

# --------------------------------------------------------------------------- #
# Single-pass prompt: the AI sees RAW template text + RAW candidate text
# and performs analysis + transformation in one shot.
# No lossy JSON intermediary — maximum fidelity.
# --------------------------------------------------------------------------- #

RESUME_TRANSFORM_PROMPT = """
# TASK: High-Fidelity Resume Style Transfer

You are an Elite Resume Architect. Your goal is to transform the [CANDIDATE RESUME] so that it becomes a structural and stylistic twin of the [TEMPLATE RESUME].

## PHASE 1: TEMPLATE DNA ANALYSIS (do this silently — do NOT output this phase)
Analyze the [TEMPLATE RESUME] and extract the following:
1. **Structural Blueprint**: Pick the FIRST entry in each major section. Identify every label, bolding pattern, and separator used in that entry.
2. **Section Heading Style**: Extract the EXACT formatting of every section heading. Note:
   - Casing: ALL-CAPS, Title Case, or lowercase
   - Decoration: bold (**), underline, horizontal rules (---), or special characters (e.g., ═══, ──)
   - Markdown heading level: #, ##, ###, or plain text
   - Prefix/suffix patterns (e.g., "── EDUCATION ──" or "**SKILLS**")
3. **Section Sequence**: Note the exact order of sections from top to bottom.
4. **Content Style**: Analyze the tone, tense (past vs present), and level of conciseness in the bullet points.

## PHASE 2: SEMANTIC MAPPING & TRANSFORMATION
Transform the [CANDIDATE RESUME] using these STRICT RULES:

1. **IDENTITY PROTECTION**: Use the Candidate's Name and Contact Info ONLY. Never use the template's personal details.
2. **SECTION HEADING STYLE CLONING (CRITICAL)**:
   - Every section heading in your output MUST use the IDENTICAL formatting as the template's headings.
   - If the template uses `## **EXPERIENCE**` → you MUST use `## **EXPERIENCE**` (same level, bold, caps).
   - If the template uses `EDUCATION` with a `---` line beneath → you MUST do the same.
   - If the template uses `### Projects` in Title Case → you MUST use `### Projects` in Title Case.
   - NEVER invent your own heading style. CLONE the template's heading format character-for-character.
3. **STRICT ARCHITECTURAL ADHERENCE**:
   - Use the EXACT section order of the template.
   - ONLY include sections present in the template. If the candidate has data (like "Certifications") but the template has no section for it, OMIT it.
   - If the candidate has no data for a template section, OMIT that entire section header and body.
4. **MASTER PATTERN CLONING**: Every entry in a section (e.g., every project) MUST follow the exact structural blueprint found in the template's first entry for that section.
5. **SEMANTIC MAPPING**: Map candidate data based on MEANING (e.g., map an "Internship" to the template's "Experience" section).
6. **ZERO PLACEHOLDERS**: If a field in the blueprint has no candidate data, DELETE the entire line. Never use "null", "N/A", or placeholders.
7. **CATEGORY-BASED SKILLS**: Group technical skills by their categories from the candidate resume. Use the template's bullet/separator pattern. DO NOT invent generic labels.
8. **CASING INTEGRITY**: Only use ALL-CAPS for Section Headings if the template does. Descriptions and Summaries must remain in professional Sentence Case.
9. **NEWLINE INTEGRITY**: Every field and bullet must start on a NEW LINE to ensure vertical structure.

## [TEMPLATE RESUME]
{template_text}

## [CANDIDATE RESUME]
{candidate_resume}

## OUTPUT
Return ONLY the final transformed resume in clean Markdown. No commentary, no explanations.
"""

RESUME_REFINE_PROMPT = """
You are an Elite Resume Architect. Update the following Markdown resume based on the User's instruction.

USER INSTRUCTION:
{instruction}

CURRENT RESUME (MARKDOWN):
{current_markdown}

STRICT RULES:
1. APPLY the instruction precisely.
2. PRESERVE ALL ACTUAL DATA: Keep real names, dates, and details.
3. PRESERVE LAYOUT: Keep the existing headers and bolding patterns.
4. RETURN ONLY the updated Markdown text.
"""


class StyleTransferAI:
    @staticmethod
    async def transform_resume(candidate_text: str, template_text: str) -> str:
        """
        Single-pass style transfer: the AI sees both raw texts directly.
        No lossy JSON intermediary — maximum structural fidelity.
        """
        prompt = RESUME_TRANSFORM_PROMPT.format(
            template_text=template_text,
            candidate_resume=candidate_text
        )
        try:
            response = await groq_llm.ainvoke([HumanMessage(content=prompt)])
            return response.content.strip()
        except Exception as e:
            logger.error("style_transfer.ai.transform_failed", error=str(e))
            return candidate_text

    @staticmethod
    async def refine_resume(current_markdown: str, instruction: str) -> str:
        """
        Refines a resume based on user feedback.
        """
        prompt = RESUME_REFINE_PROMPT.format(
            instruction=instruction,
            current_markdown=current_markdown
        )
        try:
            response = await groq_llm.ainvoke([HumanMessage(content=prompt)])
            return response.content.strip()
        except Exception as e:
            logger.error("style_transfer.ai.refine_failed", error=str(e))
            return current_markdown
