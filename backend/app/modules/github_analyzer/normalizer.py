from datetime import datetime

def parse_dt(dt_str: str):
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))

def normalize_github_data(repos: list) -> dict:
    active_repos = [r for r in repos if not r.get('archived') and not r.get('disabled')]
    original_repos = [r for r in active_repos if not r.get('fork')]
    
    languages = {}
    for repo in original_repos:
        lang = repo.get('language')
        if lang:
            languages[lang] = languages.get(lang, 0) + 1
            
    push_dates = [parse_dt(r['pushed_at']) for r in active_repos if r.get('pushed_at')]
    most_recent_push = max(push_dates) if push_dates else None
    
    return {
        'total_repos': len(active_repos),
        'original_repos': len(original_repos),
        'forked_repos': len(active_repos) - len(original_repos),
        'fork_ratio': round((len(active_repos) - len(original_repos)) / max(len(active_repos), 1), 2),
        'total_stars': sum(r.get('stargazers_count', 0) for r in active_repos),
        'total_forks_received': sum(r.get('forks_count', 0) for r in original_repos),
        'top_languages': dict(sorted(languages.items(), key=lambda x: -x[1])[:5]),
        'has_recent_activity': bool(most_recent_push and (datetime.now(most_recent_push.tzinfo) - most_recent_push).days < 90),
        'avg_repo_size_kb': round(sum(r.get('size', 0) for r in original_repos) / max(len(original_repos), 1)),
        'repos_with_description': sum(1 for r in original_repos if r.get('description')),
        'repos_with_license': sum(1 for r in original_repos if r.get('license')),
        'top_repos': sorted(original_repos, key=lambda r: r.get('stargazers_count', 0), reverse=True)[:5],
    }

def compute_authenticity_score(normalized_data: dict) -> tuple[float, list[str]]:
    flags = []
    score = 1.0
    
    if normalized_data["total_repos"] < 3:
        flags.append("very_few_repos"); score -= 0.2
    if normalized_data["fork_ratio"] > 0.8:
        flags.append("mostly_forks"); score -= 0.25
    if not normalized_data["has_recent_activity"]:
        flags.append("no_recent_activity"); score -= 0.15
        
    return max(0.0, score), flags
