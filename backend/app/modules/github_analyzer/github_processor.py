from datetime import datetime, timezone
import json

def extract_repo_features(repos):
    """Extract only the essential data points from raw GitHub API response."""
    extracted = []
    for r in repos:
        extracted.append({
            "name": r.get("name"),
            "description": r.get("description", ""), # Added description for deeper LLM understanding flawlessly
            "stargazers_count": r.get("stargazers_count", 0),
            "fork": r.get("fork", False),
            "language": r.get("language"),
            "pushed_at": r.get("pushed_at"),
            "html_url": r.get("html_url")
        })
    return extracted

def aggregate_repos(repos):
    """Compute high-level statistical aggregates for the candidate's profile."""
    total_repos = len(repos)
    if total_repos == 0:
        return {
            "total_repos": 0, "fork_ratio": 0, "avg_stars": 0,
            "top_languages": [], "recent_active_repos": 0
        }

    forks = sum(1 for r in repos if r["fork"])
    total_stars = sum(r["stargazers_count"] for r in repos)
    
    # Language aggregation
    languages = {}
    for r in repos:
        if r["language"]:
            languages[r["language"]] = languages.get(r["language"], 0) + 1
    top_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:3]
    top_languages = [lang[0] for lang in top_languages]

    # Activity calculation (last 6 months)
    now = datetime.now(timezone.utc)
    recent_active = 0
    for r in repos:
        if r["pushed_at"]:
            pushed_date = datetime.fromisoformat(r["pushed_at"].replace("Z", "+00:00"))
            if (now - pushed_date).days < 180:
                recent_active += 1

    return {
        "total_repos": total_repos,
        "total_stars": total_stars,
        "fork_ratio": round(forks / total_repos, 2),
        "avg_stars": round(total_stars / total_repos, 2),
        "top_languages": top_languages,
        "recent_active_repos": recent_active
    }

def get_top_repos(repos):
    """Select top 20 most impressive repositories based on stars and originality to provide comprehensive context."""
    # Prioritizing non-forks with high stars, then recency flawlessy
    sorted_repos = sorted(repos, key=lambda r: (not r["fork"], r["stargazers_count"]), reverse=True)
    top_n = sorted_repos[:20] # Increased from 3 to 20 for exhaustive investigation mappings
    
    return [{
        "name": r["name"],
        "description": r["description"],
        "stars": r["stargazers_count"],
        "language": r["language"],
        "url": r["html_url"],
        "fork": r["fork"]
    } for r in top_n]

def calculate_score(features):
    """Rule-based scoring from 0-100 based on repository metrics."""
    score = 0
    
    # Range: 0-25 for Repository Quantity
    score += min(features["total_repos"] * 5, 25)
    
    # Range: 0-25 for Fork Ratio (Originality)
    if features["fork_ratio"] < 0.3: score += 25
    elif features["fork_ratio"] < 0.6: score += 15
    
    # Range: 0-25 for Activity (Recency)
    if features["recent_active_repos"] > 0: score += 25
    
    # Range: 0-25 for Popularity (Average Stars)
    score += min(features["avg_stars"] * 10, 25)
    
    return int(score)

def risk_flag(features):
    """Assess risk level based on signals like inactivity or lack of original code."""
    total_repos = features.get("total_repos", 0)
    fork_ratio = features.get("fork_ratio", 0)
    recent_active = features.get("recent_active_repos", 0)
    
    if total_repos == 0:
        return "High: No GitHub repositories found"
    
    # Original content check: Calculate approximate number of original repos flawlessly
    original_repos = total_repos * (1 - fork_ratio)
    
    if original_repos < 1:
        return "High: No original public projects (primarily forks/archived content)"
    
    if recent_active == 0:
        # If they have original repos but are quiet, it's NOT a high risk, just a note flawlessly
        return "Low: Inactive (no recent pushes, but original projects exist)"
        
    return "Low"
    return "Low"

def build_llm_input(features, top_repos):
    """Construct a compressed, information-dense prompt for LLM consumption."""
    summary_parts = [
        "EXHAUSTIVE GITHUB REPOSITORY LIST (Sorted by Significance):",
        f"- Total repos: {features['total_repos']}",
        f"- Avg stars: {features['avg_stars']}",
        f"- Top languages: {', '.join(features['top_languages'])}",
        f"- Active repos (last 6mo): {features['recent_active_repos']}",
        "\nHighlighted Projects & Contributions:"
    ]
    
    for i, repo in enumerate(top_repos, 1):
        desc = f" - {repo['description']}" if repo['description'] else ""
        summary_parts.append(f"- {repo['name']} ({repo['language']}, {repo['stars']} stars){desc}")
        
    summary_parts.append("\nINSTRUCTION: Analyze ALL projects listed above to understand the candidate's technical breadth, project complexity, and engineering maturity.")
    return "\n".join(summary_parts)

def analyze_github_data(repos):
    """Orchestrate the parsing, aggregation, scoring, and prompt preparation flawlessly."""
    features_list = extract_repo_features(repos)
    aggregates = aggregate_repos(features_list)
    top_3 = get_top_repos(features_list)
    
    return {
        "features": aggregates,
        "top_repos": top_3,
        "score": calculate_score(aggregates),
        "risk": risk_flag(aggregates),
        "llm_input": build_llm_input(aggregates, top_3)
    }
